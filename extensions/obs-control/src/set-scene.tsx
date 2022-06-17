import { Action, ActionPanel, Icon, List } from "@raycast/api";
import OBSWebSocket from "obs-websocket-js";
import useSWR from "swr";

const obs = new OBSWebSocket();

export default function SetScene() {
  const { data, mutate } = useSWR("/api/scenes", async () => {
    await obs.connect("ws://localhost:4455");

    return await obs.call("GetSceneList");
  });

  return (
    <List>
      {data?.scenes.map((scene: any) => {
        const isCurrent = data?.currentProgramSceneName === scene.sceneName;

        return (
          <List.Item
            title={scene.sceneName}
            key={scene.sceneIndex}
            accessories={[
              {
                icon: isCurrent ? Icon.Checkmark : null,
                tooltip: isCurrent ? "Current Scene" : null,
              }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Scene"
                  onAction={async () => {
                    await obs.call("SetCurrentProgramScene", { sceneName: scene.sceneName })
                    mutate();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
