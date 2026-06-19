import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AddOWLAction } from "./components/AddOWLAction";
import { ClearAllOWLsAction } from "./components/ClearAllOWLsAction";
import { DeleteAllOWLsAction } from "./components/DeleteAllOWLsAction";
import { ResetToDefaultOWLAction } from "./components/ResetToDefaultOWLAction";
import { ViewOWLs } from "./components/ViewOWLs";
import { useLanguages } from "./hooks/languages";
import { useCachedStorage } from "./hooks/storage";
import { useInitializeOWLs } from "./hooks/useInitializeOWLs";
import { OWLMapping } from "./types/owl";
import { StorageKey } from "./types/storage";

export default function ConfigureOWLsCommand() {
  useInitializeOWLs();

  const [owls] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});
  const { value: languages, isLoading } = useLanguages();

  return (
    <List isLoading={isLoading || languages.length === 0}>
      <List.EmptyView
        title={"No OWLs found"}
        actions={
          <ActionPanel>
            <AddOWLAction />
            <ResetToDefaultOWLAction />
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
                <ActionPanel.Section>
                  {owls[language] !== undefined && <DeleteAllOWLsAction language={language} />}
                  <ResetToDefaultOWLAction />
                  <ClearAllOWLsAction />
                </ActionPanel.Section>
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
