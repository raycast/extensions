import type OBSWebSocket from "obs-websocket-js";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import type { LaunchProps } from "@raycast/api";
import { Action, ActionPanel, Color, Icon, List, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getObs } from "@/lib/obs";
import { showWebsocketConnectionErrorToast } from "@/lib/utils";
import useIsInstalled from "./hooks/use-is-installed";

let obs: OBSWebSocket;

type Scene = {
  sceneName: string;
  sceneIndex: number;
};

type SceneListResponse = {
  scenes: Scene[];
  currentProgramSceneName: string;
};

function findScene(scenes: Scene[], sceneName: string) {
  const exactMatch = scenes.find((scene) => scene.sceneName === sceneName);
  if (exactMatch) {
    return exactMatch;
  }

  return scenes.find((scene) => scene.sceneName.toLocaleLowerCase() === sceneName.toLocaleLowerCase());
}

export default function SetScene(props: LaunchProps<{ arguments: { sceneName?: string } }>) {
  const isAppInstalled = useIsInstalled();
  const didAutoSelectScene = useRef(false);
  const requestedSceneName = props.arguments.sceneName?.trim();
  const { data, mutate, error } = useSWR(
    () => (isAppInstalled ? "/api/scenes" : null),
    async () => {
      obs = await getObs();
      return (await obs.call("GetSceneList")) as unknown as SceneListResponse;
    },
  );

  if (error) {
    showWebsocketConnectionErrorToast();
  }

  useEffect(() => {
    if (!data || didAutoSelectScene.current) {
      return;
    }

    const scene = requestedSceneName
      ? findScene(data.scenes, requestedSceneName)
      : data.scenes.length === 1
        ? data.scenes[0]
        : null;

    if (!scene) {
      if (requestedSceneName) {
        didAutoSelectScene.current = true;
        showFailureToast(`Scene "${requestedSceneName}" was not found`, {
          title: "Scene Not Found",
        });
      }
      return;
    }

    const selectedScene = scene;

    async function setScene() {
      didAutoSelectScene.current = true;
      await obs.call("SetCurrentProgramScene", { sceneName: selectedScene.sceneName });
      await showHUD(`Switched to ${selectedScene.sceneName}`);
      popToRoot();
    }

    setScene();
  }, [data, requestedSceneName]);

  return (
    <List isLoading={!data && !error}>
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
