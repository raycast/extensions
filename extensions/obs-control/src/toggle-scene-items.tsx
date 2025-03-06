import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { SceneItem } from "@/types";
import { callObs } from "@/lib/obs";
import useOBSRequest from "@/hooks/use-obs-request";

export default function ToggleSceneItems() {
  const { data: sceneList, error: scenesError, isLoading: scenesIsLoading } = useOBSRequest("GetSceneList");
  const {
    data,
    error: itemsError,
    isLoading,
    revalidate,
  } = useOBSRequest("GetSceneItemList", !!sceneList?.currentProgramSceneUuid && !scenesIsLoading, {
    sceneUuid: sceneList?.currentProgramSceneUuid,
  });
  const error = scenesError || itemsError;

  if (error) {
    showFailureToast(error, {
      title: "Failed to get scene items",
    });
  }

  const items = (data?.sceneItems || []) as Array<SceneItem>;

  return (
    <List isLoading={scenesIsLoading || isLoading} searchBarPlaceholder="Search for scene items">
      {items.map((item) => (
        <List.Item
          key={item.sourceUuid}
          title={item.sourceName}
          icon={item.sceneItemEnabled ? Icon.Eye : Icon.EyeDisabled}
          accessories={[
            {
              icon: item.sceneItemLocked ? Icon.Lock : Icon.LockDisabled,
              tooltip: item.sceneItemLocked ? "Locked" : "Not locked",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={item.sceneItemEnabled ? "Disable" : "Enable"}
                  onAction={async () => {
                    await callObs("SetSceneItemEnabled", {
                      sceneUuid: sceneList?.currentProgramSceneUuid,
                      sceneItemEnabled: !item.sceneItemEnabled,
                      sceneItemId: item.sceneItemId,
                    });
                    revalidate();
                  }}
                  icon={item.sceneItemEnabled ? Icon.EyeDisabled : Icon.Eye}
                />
                <Action
                  title={item.sceneItemLocked ? "Unlock" : "Lock"}
                  onAction={async () => {
                    await callObs("SetSceneItemLocked", {
                      sceneUuid: sceneList?.currentProgramSceneUuid,
                      sceneItemLocked: !item.sceneItemLocked,
                      sceneItemId: item.sceneItemId,
                    });
                    revalidate();
                  }}
                  icon={item.sceneItemLocked ? Icon.LockDisabled : Icon.Lock}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action title="Reload" onAction={revalidate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
