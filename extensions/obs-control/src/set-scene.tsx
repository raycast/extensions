import type OBSWebSocket from "obs-websocket-js";
import useSWR from "swr";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getObs } from "@/lib/obs";
import { showWebsocketConnectionErrorToast } from "@/lib/utils";
import useIsInstalled from "./hooks/use-is-installed";

let obs: OBSWebSocket;

export default function SetScene() {
  const isAppInstalled = useIsInstalled();
  const { data, mutate, error } = useSWR(
    () => (isAppInstalled ? "/api/scenes" : null),
    async () => {
      obs = await getObs();
      return (await obs.call("GetSceneList")) as unknown as {
        scenes: Array<{
          sceneName: string;
          sceneIndex: number;
        }>;
        currentProgramSceneName: string;
      };
    },
  );

  if (error) {
    showWebsocketConnectionErrorToast();
  }

  return (
    <List>
      {data?.scenes.map((scene) => {
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
