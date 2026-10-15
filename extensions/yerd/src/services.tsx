import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { DatabasesView } from "./components/DatabasesView";
import { ServiceLogs } from "./components/ServiceLogs";
import { serviceStateIcon } from "./helpers/format";
import { runYerd, TIMEOUTS } from "./yerd/cli";
import type {
  ServiceAvailableResponse,
  ServicesResponse,
  YerdService,
} from "./yerd/types";

const CONTROL_LABELS = {
  start: { progress: "Starting", done: "started" },
  stop: { progress: "Stopping", done: "stopped" },
  restart: { progress: "Restarting", done: "restarted" },
} as const;

function failureTitle(e: unknown): string {
  return (e as { userMessage?: string }).userMessage ?? "Failed";
}

/** Map serviceStateIcon's string tokens onto Raycast Icon/Color values. */
function stateIcon(state: string) {
  const { icon, tintColor } = serviceStateIcon(state);
  return { source: Icon[icon], tintColor: Color[tintColor] };
}

export default function Services() {
  const [showDetail, setShowDetail] = useState(false);
  const {
    isLoading: svcLoading,
    data: svcData,
    revalidate,
  } = useCachedPromise(() => runYerd<ServicesResponse>(["services"]), [], {
    keepPreviousData: true,
  });
  const { data: availData, revalidate: revalidateAvailable } = useCachedPromise(
    () => runYerd<ServiceAvailableResponse>(["service", "available"]),
    [],
    { keepPreviousData: true },
  );

  // `services` lists every known engine, including ones with no installed
  // versions (e.g. stopped mariadb/postgres shells) — "installed" means at
  // least one version is present.
  const services = (svcData?.services ?? []).filter(
    (s) => s.installed_versions.length > 0,
  );
  const installedIds = new Set(services.map((s) => s.service));
  const available =
    availData?.services.filter(
      (a) => !installedIds.has(a.service) && a.available.length > 0,
    ) ?? [];

  async function controlService(
    id: string,
    action: "start" | "stop" | "restart",
  ) {
    const labels = CONTROL_LABELS[action];
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${labels.progress} ${id}…`,
    });
    try {
      await runYerd(["service", action, id], { timeoutMs: TIMEOUTS.mutate });
      toast.style = Toast.Style.Success;
      toast.title = `${id} ${labels.done}`;
      revalidate();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  async function installService(serviceId: string, version: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${serviceId} ${version}…`,
    });
    try {
      await runYerd(["service", "install", serviceId, version], {
        timeoutMs: TIMEOUTS.install,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Installed ${serviceId} ${version}`;
      revalidate();
      revalidateAvailable();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  async function uninstallService(service: YerdService) {
    const version = service.selected_version ?? service.installed_versions[0];
    if (!version) return;
    const ok = await confirmAlert({
      title: `Uninstall ${service.display_name} ${version}?`,
      message:
        "The service will be removed. Its stored data will be left intact.",
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Uninstalling ${service.service}…`,
    });
    try {
      await runYerd(["service", "uninstall", service.service, version], {
        timeoutMs: TIMEOUTS.install,
      });
      toast.style = Toast.Style.Success;
      toast.title = `${service.service} uninstalled`;
      revalidate();
      revalidateAvailable();
    } catch (e) {
      await showFailureToast(e, { title: failureTitle(e) });
    }
  }

  return (
    <List
      isLoading={svcLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search services…"
    >
      <List.Section title="Installed Services">
        {services.map((service) => (
          <List.Item
            key={service.service}
            icon={stateIcon(service.state)}
            title={service.display_name}
            subtitle={service.selected_version ?? ""}
            accessories={[
              { text: service.listen ?? `port ${service.port}` },
              {
                tag: {
                  value: service.state,
                  color:
                    service.state === "running"
                      ? Color.Green
                      : Color.SecondaryText,
                },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="State"
                      text={service.state}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Port"
                      text={String(service.port)}
                    />
                    {service.listen && (
                      <List.Item.Detail.Metadata.Label
                        title="Listen"
                        text={service.listen}
                      />
                    )}
                    {service.pid != null && (
                      <List.Item.Detail.Metadata.Label
                        title="PID"
                        text={String(service.pid)}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Version"
                      text={service.selected_version ?? "—"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {service.state !== "running" && (
                  <Action
                    title="Start"
                    icon={Icon.Play}
                    onAction={() => controlService(service.service, "start")}
                  />
                )}
                {service.state === "running" && (
                  <Action
                    title="Stop"
                    icon={Icon.Stop}
                    onAction={() => controlService(service.service, "stop")}
                  />
                )}
                <Action
                  title="Restart"
                  icon={Icon.RotateClockwise}
                  onAction={() => controlService(service.service, "restart")}
                />
                <Action.Push
                  title="View Logs"
                  icon={Icon.List}
                  target={<ServiceLogs serviceId={service.service} />}
                />
                {service.supports_databases && service.state === "running" && (
                  <Action.Push
                    title="Databases"
                    icon={Icon.HardDrive}
                    target={<DatabasesView serviceId={service.service} />}
                  />
                )}
                <Action
                  title={showDetail ? "Hide Details" : "Show Details"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() => setShowDetail((v) => !v)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action
                  title="Uninstall"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => uninstallService(service)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {available.length > 0 && (
        <List.Section title="Available to Install">
          {available.map((a) =>
            a.available.map((version) => (
              <List.Item
                key={`${a.service}-${version}`}
                icon={Icon.Download}
                title={a.service}
                subtitle={version}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Install ${version}`}
                      icon={Icon.Download}
                      onAction={() => installService(a.service, version)}
                    />
                  </ActionPanel>
                }
              />
            )),
          )}
        </List.Section>
      )}
    </List>
  );
}
