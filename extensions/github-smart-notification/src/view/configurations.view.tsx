import { Action, ActionPanel, Detail, List, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Configuration, removeConfig } from "../lib/configurations";
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
                    markdown={`# ${s.description}\n**Repository** = ${s.repository}\n\n**Title** = ${s.title}\n\n**Reason** = ${s.reason}\n\n
              `}
                  />
                }
              />
              <Action
                title="Delete"
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
