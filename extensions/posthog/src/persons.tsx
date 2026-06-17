import { LaunchProps } from "@raycast/api";
import { Action, ActionPanel, List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useUrl } from "../helpers/useUrl";
import { WithProjects, ProjectSelector, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Person[];
};

type Person = {
  id: number;
  name: string;
  distinct_ids: string[];
};

export type PersonsArguments = {
  term: string;
};

function Persons({ searchTerm }: { searchTerm: string }) {
  const { selectedId } = useContext(ProjectsContext);
  const { data, isLoading } = usePostHogClient<SearchResult>(
    "projects/" + selectedId + "/persons?search=" + searchTerm
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
          {data.results.map((person) => (
            <ResultsListSection key={person.id} person={person} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

const ResultsListSection = ({ person }: { person: Person }) => {
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
};

export default function Command(props: LaunchProps<{ arguments: PersonsArguments }>) {
  return (
    <WithProjects>
      <Persons searchTerm={props.arguments.term} />
    </WithProjects>
  );
}
