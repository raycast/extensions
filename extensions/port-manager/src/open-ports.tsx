import { Action, ActionPanel, Color, Icon, List, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { CopyCommandsActionsMenu } from "./actions/CopyCommandsActionMenu";
import CopyInfoActionsMenu from "./actions/CopyInfoActionsMenu";
import KillActions from "./actions/KillActions";
import KillAllActions from "./actions/KillAllActions";
import KillParentActions, { isProcessWithKillableParent } from "./actions/KillParentActions";
import { ShowInFinderActionMenu } from "./actions/ShowInFinderActionMenu";
import Toasts from "./feedback/Toasts";
import useProcesses from "./hooks/useProcesses";

export default function Command() {
  const [processes, reloadProcesses] = useProcesses();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("showDetail", false);

  const knownOnTop = processes.sort((a, b) => Number(b.known) - Number(a.known));

  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={processes.length === 0}
      navigationTitle="Kill Port"
      searchBarPlaceholder="Search Open Ports"
    >
      {knownOnTop.map((p) => {
        const accessories: List.Item.Props["accessories"] = isShowingDetail
          ? undefined
          : [
              {
                text: [...new Set(p.portInfo?.map((i) => `${i.port}`))].join(", "),
              },
            ];
        if (!isShowingDetail && p.known) {
          accessories?.push({
            tag: { value: p.nickname, color: Color.Green },
          });
        }
        return (
          <List.Item
            key={p.pid}
            title={p.name ?? "Untitled Process"}
            subtitle={isShowingDetail ? "" : p.user ?? ""}
            keywords={p.portInfo?.map((i) => `${i.port}`).concat(p.portInfo?.map((i) => `${i.host}`))}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {!p.known && <List.Item.Detail.Metadata.Label title="Info" />}
                    {p.known && (
                      <List.Item.Detail.Metadata.TagList title="Info">
                        <List.Item.Detail.Metadata.TagList.Item color={Color.Green} text={p.nickname} />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Name" text={p.name} />
                    <List.Item.Detail.Metadata.Label title="User" text={`${p.user} (${p.uid})`} />
                    <List.Item.Detail.Metadata.Label title="PID" text={`${p.pid}`} />
                    {p.path !== undefined && <List.Item.Detail.Metadata.Label title="Path" text={p.path} />}
                    <List.Item.Detail.Metadata.Label title="Parent PID" text={`${p.parentPid}`} />
                    {p.parentPath !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Parent Path" text={p.parentPath} />
                    )}
                    <List.Item.Detail.Metadata.Label title="Protocol" text={`${p.protocol}`} />
                    <List.Item.Detail.Metadata.Label title="" />
                    <List.Item.Detail.Metadata.Label title="Ports" />
                    <List.Item.Detail.Metadata.Separator />
                    {p.portInfo?.map((i, index) => (
                      <List.Item.Detail.Metadata.Label key={index} title={i.host} text={`${i.port}`} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <KillActions
                  process={p}
                  onKilled={async () => {
                    await showToast(Toasts.KillProcess.Success(p));
                    await reloadProcesses();
                  }}
                  onError={async (err) => {
                    await showToast(Toasts.KillProcess.Error(err));
                    await reloadProcesses();
                  }}
                />
                <KillAllActions
                  process={p}
                  onKilled={async () => {
                    await showToast(Toasts.KillProcess.Success(p));
                    await reloadProcesses();
                  }}
                  onError={async (err) => {
                    await showToast(Toasts.KillProcess.Error(err));
                    await reloadProcesses();
                  }}
                />
                {isProcessWithKillableParent(p) && (
                  <KillParentActions
                    process={p}
                    onKilled={async () => {
                      await showToast(Toasts.KillProcess.Success(p));
                      await reloadProcesses();
                    }}
                    onError={async (err) => {
                      await showToast(Toasts.KillProcess.Error(err));
                      await reloadProcesses();
                    }}
                  />
                )}
                <Action
                  title="Show Details"
                  icon={Icon.QuestionMark}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <ShowInFinderActionMenu process={p} />
                <CopyInfoActionsMenu process={p} />
                <CopyCommandsActionsMenu process={p} />
                <Action title="Reload" onAction={reloadProcesses} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
            accessories={accessories}
          />
        );
      })}
    </List>
  );
}
