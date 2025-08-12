import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AddOWLAction } from "./components/AddOWLAction";
import { ViewOWLs } from "./components/ViewOWLs";
import { useLanguages } from "./hooks/languages";
import { useCachedStorage } from "./hooks/storage";
import { OWLMapping } from "./types/owl";
import { StorageKey } from "./types/storage";

export default function ConfigureOWLsCommand() {
  const [owls] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});
  const { value: languages, isLoading } = useLanguages();

  return (
    <List isLoading={isLoading || languages.length === 0}>
      <List.EmptyView
        title={"No OWLs found"}
        actions={
          <ActionPanel>
            <AddOWLAction />
          </ActionPanel>
        }
      />
      {languages.map((language) => {
        return (
          <List.Item
            key={language}
            title={language}
            actions={
              <ActionPanel>
                {owls[language] !== undefined && (
                  <Action.Push title={"View Owls"} icon={Icon.List} target={<ViewOWLs language={language} />} />
                )}
                <AddOWLAction base={language} />
              </ActionPanel>
            }
            accessories={(owls[language] ?? [])
              .filter((owl) => owl.from === language)
              .map((owl) => ({
                tag: owl.to,
              }))}
          />
        );
      })}
    </List>
  );
}
