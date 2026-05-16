import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { Person, searchPersons } from "./api/persons";

export type PersonsArguments = {
  term: string;
};

function Persons({ searchTerm }: { searchTerm: string }) {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = useCachedPromise(
    (id: string, term: string) => searchPersons(id, term).then((r) => r.results),
    [selectedId ?? "", searchTerm],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't search persons" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search persons..."
      searchBarAccessory={<ProjectSelector />}
      throttle
    >
      {data ? (
        <List.Section title="Results">
          {data.map((person) => (
            <PersonItem key={person.id} person={person} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function PersonItem({ person }: { person: Person }) {
  const originalId = person.distinct_ids[person.distinct_ids.length - 1];
  const appUrl = useUrl(`person/${originalId}`);
  return (
    <List.Item
      key={person.id}
      title={person.name}
      actions={
        <ActionPanel title={person.name}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={appUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={appUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: PersonsArguments }>) {
  return (
    <WithProjects>
      <Persons searchTerm={props.arguments.term} />
    </WithProjects>
  );
}
