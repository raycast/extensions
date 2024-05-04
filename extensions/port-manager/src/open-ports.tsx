import { Action, ActionPanel, Color, Icon, List, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { CopyCommandsActionsMenu } from "./actions/CopyCommandsActionMenu";
import CopyInfoActionsMenu from "./actions/CopyInfoActionsMenu";
import KillActions from "./actions/KillActions";
import KillAllActions from "./actions/KillAllActions";
import KillParentActions from "./actions/KillParentActions";
import { ShowInFinderActionMenu } from "./actions/ShowInFinderActionMenu";
import Toasts from "./feedback/Toasts";
import { useNamedPorts } from "./hooks/useNamedPorts";
import useProcesses from "./hooks/useProcesses";
import { getProcessAccessories } from "./utilities/getProcessAccessories";

export default function Command() {
  const { processes, revalidateProcesses, isLoadingProcesses } = useProcesses();
  const { getNamedPort } = useNamedPorts();

  const [isShowingDetail, setIsShowingDetail] = useCachedState("showDetail", false);

  return (
    <List isShowingDetail={isShowingDetail} isLoading={isLoadingProcesses} searchBarPlaceholder="Search Open Ports">
      {processes?.map((p) => (
        <List.Item
          key={p.pid}
          title={p.name ?? "Untitled Process"}
          subtitle={isShowingDetail ? "" : p.user ?? ""}
          keywords={p.portInfo
            ?.map((i) => `${i.port}`)
            .concat(p.portInfo?.map((i) => `${i.host}`))
            .concat(p.portInfo?.map((i) => `${i.name}`))}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Name" text={p.name} />
                  <List.Item.Detail.Metadata.Label title="User" text={`${p.user} (${p.uid})`} />
                  <List.Item.Detail.Metadata.Label title="PID" text={`${p.pid}`} />
                  {p.path !== undefined && <List.Item.Detail.Metadata.Label title="Path" text={p.path} />}
                  <List.Item.Detail.Metadata.Label title="Parent PID" text={`${p.parentPid}`} />
                  {p.parentPath !== undefined && (
                    <List.Item.Detail.Metadata.Label title="Parent Path" text={p.parentPath} />
                  )}
                  <List.Item.Detail.Metadata.Label title="Protocol" text={`${p.protocol}`} />
                  {p.portInfo && (
                    <List.Item.Detail.Metadata.TagList title="Ports">
                      {p.portInfo.map((i, index) => {
                        const name = getNamedPort(i.port)?.name;
                        if (name !== undefined) {
                          return (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={index}
                              text={`${i.port} (${name})`}
                              color={Color.Green}
                            />
                          );
                        }

                        return <List.Item.Detail.Metadata.TagList.Item key={index} text={`${i.port}`} />;
                      })}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <KillActions
                process={p}
                onKilled={() => {
                  showToast(Toasts.KillProcess.Success(p));
                  revalidateProcesses();
                }}
                onError={(err) => {
                  showToast(Toasts.KillProcess.Error(err));
                  revalidateProcesses();
                }}
              />
              <KillAllActions
                process={p}
                onKilled={() => {
                  showToast(Toasts.KillProcess.Success(p));
                  revalidateProcesses();
                }}
                onError={(err) => {
                  showToast(Toasts.KillProcess.Error(err));
                  revalidateProcesses();
                }}
              />
              <KillParentActions
                process={p}
                onKilled={() => {
                  showToast(Toasts.KillProcess.Success(p));
                  revalidateProcesses();
                }}
                onError={async (err) => {
                  showToast(Toasts.KillProcess.Error(err));
                  revalidateProcesses();
                }}
              />
              <Action
                title="Show Details"
                icon={Icon.QuestionMark}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
              <ShowInFinderActionMenu process={p} />
              <CopyInfoActionsMenu process={p} />
              <CopyCommandsActionsMenu process={p} />
              <Action title="Reload" onAction={revalidateProcesses} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
          accessories={isShowingDetail ? undefined : getProcessAccessories(p)}
        />
      ))}
    </List>
  );
}
