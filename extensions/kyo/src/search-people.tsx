import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { People } from "./api/resources";
import { useCompanies } from "./hooks/useLookups";
import { indexByName } from "./lib/helpers";
import { EditPersonForm } from "./components/EditPersonForm";
import CreatePerson from "./create-person";
import { LogOutAction } from "./components/AuthActions";

export default function SearchPeople() {
  const {
    data: people,
    isLoading,
    revalidate,
  } = useCachedPromise(() => People.list(), [], { initialData: [] });
  const { data: companies } = useCompanies();
  const companyNames = indexByName(companies);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search people by name…">
      <List.EmptyView
        title="No people"
        icon={Icon.Person}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Person"
              icon={Icon.Plus}
              target={<CreatePerson />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {people.map((person) => (
        <List.Item
          key={person.id}
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          title={person.name}
          subtitle={person.position}
          accessories={[
            person.company_id && companyNames.get(person.company_id)
              ? { tag: companyNames.get(person.company_id)! }
              : person.company
                ? { tag: person.company }
                : {},
            person.email ? { text: person.email, icon: Icon.Envelope } : {},
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Person"
                icon={Icon.Pencil}
                target={<EditPersonForm person={person} onSaved={revalidate} />}
              />
              {person.email && (
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={person.email}
                />
              )}
              {person.linkedin_url && (
                <Action.OpenInBrowser
                  // eslint-disable-next-line @raycast/prefer-title-case -- "LinkedIn" is the brand's casing
                  title="Open LinkedIn"
                  url={person.linkedin_url}
                />
              )}
              <ActionPanel.Section>
                <Action.Push
                  title="Create Person"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreatePerson />}
                  onPop={revalidate}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <LogOutAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
