import { Action, ActionPanel, Color, Icon, List, showToast, getPreferenceValues } from "@raycast/api";
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
import { platformShortcut } from "./utilities/platform";

export default function Command() {
  const { primaryPortAction } = getPreferenceValues();
  const { processes, revalidateProcesses, isLoadingProcesses, processesError } = useProcesses();
  const { getNamedPort } = useNamedPorts();

  const [isShowingDetail, setIsShowingDetail] = useCachedState("showDetail", false);

  const hasProcesses = (processes?.length ?? 0) > 0;

  return (
    <List isShowingDetail={isShowingDetail} isLoading={isLoadingProcesses} searchBarPlaceholder="Search Open Ports">
      {processesError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to List Ports"
          description={processesError instanceof Error ? processesError.message : "Unknown error"}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidateProcesses} />
            </ActionPanel>
          }
        />
      ) : !isLoadingProcesses && !hasProcesses ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="No Open Ports"
          description="No processes are listening on TCP ports."
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidateProcesses} />
            </ActionPanel>
          }
        />
      ) : null}
      {processes?.map((p) => {
        const actions = [
          {
            action: (
              <KillActions
                key="kill"
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
            ),
            id: "kill",
          },
          {
            action: (
              <KillAllActions
                key="killAll"
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
            ),
            id: "killAll",
          },
          {
            action: (
              <KillParentActions
                key="killParent"
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
            ),
            id: "killParent",
          },
          {
            action: (
              <Action
                key="showDetails"
                title="Show Details"
                icon={Icon.QuestionMark}
                shortcut={platformShortcut(
                  { modifiers: ["cmd", "shift"], key: "d" },
                  { modifiers: ["ctrl", "shift"], key: "d" },
                )}
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
            ),
            id: "showDetails",
          },
          {
            action: <ShowInFinderActionMenu key="showInFinder" process={p} />,
            id: "showInFinder",
          },
          {
            action: <CopyInfoActionsMenu key="copyInfo" process={p} />,
            id: "copyInfo",
          },
          {
            action: <CopyCommandsActionsMenu key="copyCommands" process={p} />,
            id: "copyCommands",
          },
          {
            action: <Action key="reload" title="Reload" icon={Icon.ArrowClockwise} onAction={revalidateProcesses} />,
            id: "reload",
          },
        ];

        const primaryActionIndex = actions.findIndex((a) => a.id === primaryPortAction);
        if (primaryActionIndex > -1) {
          const [primaryAction] = actions.splice(primaryActionIndex, 1);
          actions.unshift(primaryAction);
        }

        return (
          <List.Item
            key={p.pid}
            title={p.name ?? "Untitled Process"}
            subtitle={isShowingDetail ? "" : (p.user ?? "")}
            keywords={p.portInfo
              ?.map((i) => `${i.port}`)
              .concat(p.portInfo?.map((i) => `${i.host}`))
              .concat(p.portInfo?.map((i) => `${i.name}`))}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={p.name} />
                    {p.user !== undefined && (
                      <List.Item.Detail.Metadata.Label
                        title="User"
                        text={p.uid !== undefined ? `${p.user} (${p.uid})` : p.user}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label title="PID" text={`${p.pid}`} />
                    {p.path !== undefined && <List.Item.Detail.Metadata.Label title="Path" text={p.path} />}
                    {p.parentPid !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Parent PID" text={`${p.parentPid}`} />
                    )}
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
            actions={<ActionPanel>{actions.map((a) => a.action)}</ActionPanel>}
            accessories={isShowingDetail ? undefined : getProcessAccessories(p)}
          />
        );
      })}
    </List>
  );
}
