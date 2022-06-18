import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import OBSWebSocket from "obs-websocket-js";
import useSWR from "swr";
import { getObs } from "./lib/obs";

let obs: OBSWebSocket;

export default function SetScene() {
  const { data, mutate } = useSWR("/api/scenes", async () => {
    obs = await getObs();

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
                icon: isCurrent ? { source: Icon.Checkmark, tintColor: Color.Green } : null,
                tooltip: isCurrent ? "Current Program Scene" : null,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Switch to Scene"
                  onAction={async () => {
                    await obs.call("SetCurrentProgramScene", { sceneName: scene.sceneName });
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
