import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import OBSWebSocket from "obs-websocket-js";
import useSWR from "swr";
import { getObs } from "./lib/obs";
import { appInstalled, appNotInstallAlertDialog, showWebsocketConnectionErrorToast } from "./lib/utils";

let obs: OBSWebSocket;

export default function SetScene() {
  const { data: isAppInstalled } = useSWR("appInstalled", async () => {
    const installed = await appInstalled();

    if (!installed) {
      await appNotInstallAlertDialog();
    }

    return installed;
  });

  const { data, mutate, error } = useSWR(
    () => (isAppInstalled ? "/api/scenes" : null),
    async () => {
      obs = await getObs();

      return await obs.call("GetSceneList");
    }
  );

  if (error) {
    showWebsocketConnectionErrorToast();
  }

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
