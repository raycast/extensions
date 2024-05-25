import { Action, ActionPanel, Detail, Keyboard, List, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Configuration, removeConfig } from "../lib/configurations";
import ConfigurationFormView from "./configurationForm.view";
export default function ConfigurationsView() {
  const [configState, setConfig] = useCachedState<Configuration[]>("config", [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  return (
    <List>
      {configState?.map((s) => (
        <List.Item
          title={s.description}
          key={JSON.stringify(s)}
          keywords={[s.description, s.repository, s.title]}
          actions={
            <ActionPanel>
              <Action.Push
                title="See Detail"
                target={
                  <Detail
                    markdown={
                      `# ${s.description}\n**Repository** = ${s.repository}\n\n**Title** = ${s.title}\n\n**Reason** = ${s.reason}\n\n`
                    }
                  />
                }
              />
              <Action.Push
                title="Create Configuration"
                shortcut={Keyboard.Shortcut.Common.New}
                target={
                  <ConfigurationFormView />
                }
              />
              <Action
                title="Delete"
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => {
                  setConfig(removeConfig(s, configState));
                }}
              ></Action>
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
