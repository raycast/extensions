import { Action, ActionPanel, Icon, List, showToast, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { CopyCommandsActionsMenu } from "./actions/CopyCommandsActionMenu";
import CopyInfoActionsMenu from "./actions/CopyInfoActionsMenu";
import KillActions from "./actions/KillActions";
import KillAllActions from "./actions/KillAllActions";
import KillParentActions from "./actions/KillParentActions";
import { ShowInFinderActionMenu } from "./actions/ShowInFinderActionMenu";
import Toasts from "./feedback/Toasts";
import { useNamedPorts } from "./hooks/useNamedPorts";
import Process from "./models/Process";
import useProcesses from "./hooks/useProcesses";
import { getProcessAccessories } from "./utilities/getProcessAccessories";
import { Exposure, classifyExposure, exposureColor, exposureDescription } from "./utilities/exposure";
import { getProcessMarkdown } from "./utilities/getProcessMarkdown";
import { forceKill } from "./utilities/killProcess";
import { isWindows, platformShortcut } from "./utilities/platform";

type ExposureFilter = Exposure | "all";

export default function Command() {
  const { primaryPortAction } = getPreferenceValues();
  const { processes, revalidateProcesses, isLoadingProcesses, processesError } = useProcesses();
  const { getNamedPort } = useNamedPorts();

  const [isShowingDetail, setIsShowingDetail] = useCachedState("showDetail", true);
  const [exposureFilter, setExposureFilter] = useCachedState<ExposureFilter>("exposureFilter", "all");

  const visibleProcesses = processes?.filter(
    (p) => exposureFilter === "all" || p.portInfo?.some((i) => classifyExposure(i.host) === exposureFilter),
  );

  const hasProcesses = (visibleProcesses?.length ?? 0) > 0;

  return (
    <List
      isShowingDetail={isShowingDetail}
      isLoading={isLoadingProcesses}
      searchBarPlaceholder="Search Open Ports"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by exposure"
          value={exposureFilter}
          onChange={(value) => setExposureFilter(value as ExposureFilter)}
        >
          <List.Dropdown.Item title="All Ports" value="all" icon={Icon.Plug} />
          <List.Dropdown.Item title="Localhost Only" value="loopback" icon={Icon.Lock} />
          <List.Dropdown.Item title="Reachable from Network" value="all-interfaces" icon={Icon.Globe} />
          <List.Dropdown.Item title="Specific Interface" value="specific" icon={Icon.Network} />
        </List.Dropdown>
      }
    >
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
          description={
            exposureFilter === "all"
              ? "No processes are listening on TCP ports."
              : "No listening port matches this exposure filter."
          }
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidateProcesses} />
            </ActionPanel>
          }
        />
      ) : null}
      {visibleProcesses?.map((p) => {
        // Only the ports that pass the filter are displayed; actions still get the full process.
        const shown: Process =
          exposureFilter === "all"
            ? p
            : { ...p, portInfo: p.portInfo?.filter((i) => classifyExposure(i.host) === exposureFilter) };
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
                onSurvived={(survivor) => {
                  const force = isWindows
                    ? undefined
                    : () =>
                        forceKill(survivor, {
                          onKilled: () => {
                            showToast(Toasts.KillProcess.Success(p));
                            revalidateProcesses();
                          },
                          onError: (err) => {
                            showToast(Toasts.KillProcess.Error(err));
                            revalidateProcesses();
                          },
                        });
                  showToast(Toasts.KillProcess.Survived({ name: p.name, pid: survivor.pid }, force));
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
                onSurvived={(survivor) => {
                  const force = isWindows
                    ? undefined
                    : () =>
                        forceKill(survivor, {
                          onKilled: () => {
                            showToast(Toasts.KillProcess.Success({ pid: survivor.pid }));
                            revalidateProcesses();
                          },
                          onError: (err) => {
                            showToast(Toasts.KillProcess.Error(err));
                            revalidateProcesses();
                          },
                        });
                  showToast(Toasts.KillProcess.Survived({ pid: survivor.pid }, force));
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
            keywords={shown.portInfo
              ?.map((i) => `${i.port}`)
              .concat(shown.portInfo?.map((i) => `${i.host}`))
              .concat(shown.portInfo?.map((i) => `${i.name}`))
              .concat(p.commandLine !== undefined ? [p.commandLine] : [])}
            detail={
              <List.Item.Detail
                markdown={getProcessMarkdown(shown)}
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
                    {shown.portInfo && (
                      <List.Item.Detail.Metadata.TagList title="Ports">
                        {shown.portInfo.map((i, index) => {
                          const name = getNamedPort(i.port)?.name;
                          return (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={index}
                              text={name !== undefined ? `${i.port} (${name})` : `${i.port}`}
                              color={exposureColor(classifyExposure(i.host))}
                            />
                          );
                        })}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {shown.portInfo && shown.portInfo.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Exposure">
                        {Array.from(new Set(shown.portInfo.map((i) => classifyExposure(i.host)))).map((exposure) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={exposure}
                            text={exposureDescription(exposure)}
                            color={exposureColor(exposure)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={<ActionPanel>{actions.map((a) => a.action)}</ActionPanel>}
            accessories={getProcessAccessories(shown)}
          />
        );
      })}
    </List>
  );
}
