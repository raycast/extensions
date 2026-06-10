import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { classifyError, fetchProjects, nextPollInterval } from "./api";
import { getActiveDevice, getDevices, setActiveDeviceId } from "./storage";
import { ConnectionState, Device, OrchestrationProject } from "./types";
import ProjectThreads from "./project-threads";
import { AddDeviceInline } from "./setup-device";
import { readCachedProjectOverview } from "./snapshot-cache";
import { T3_CODE_ICON, appShortcut, t3CodeUrl } from "./raycast-ui";

export default function T3CodeAgents() {
  const [device, setDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [projects, setProjects] = useState<OrchestrationProject[]>([]);
  const [threadCounts, setThreadCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [hasRunning, setHasRunning] = useState<Map<string, boolean>>(new Map());
  const [connection, setConnection] = useState<ConnectionState>({
    status: "loading",
  });
  const [isLoading, setIsLoading] = useState(true);
  const retryCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);

  const loadDevice = useCallback(async () => {
    const [activeDevice, allDevices] = await Promise.all([
      getActiveDevice(),
      getDevices(),
    ]);
    setDevice(activeDevice);
    setDevices(allDevices);
    return activeDevice;
  }, []);

  const applyProjectOverview = useCallback(
    (result: {
      projects: OrchestrationProject[];
      threadCounts: Map<string, number>;
      hasRunning: Map<string, boolean>;
    }) => {
      setProjects(result.projects);
      setThreadCounts(result.threadCounts);
      setHasRunning(result.hasRunning);
    },
    [],
  );

  const doFetch = useCallback(
    async (dev: Device) => {
      try {
        const result = await fetchProjects(dev.baseUrl, dev.accessToken);
        applyProjectOverview(result);
        setConnection({ status: "connected" });
        retryCountRef.current = 0;
        return result;
      } catch (err) {
        const classified = classifyError(err);
        if (classified.code === "unauthorized") {
          setConnection({ status: "unauthorized" });
        } else if (classified.code === "offline") {
          setConnection({ status: "offline" });
        } else {
          retryCountRef.current += 1;
          setConnection({
            status: "error",
            message: classified.message,
            retryCount: retryCountRef.current,
          });
        }
        return null;
      }
    },
    [applyProjectOverview],
  );

  const schedulePoll = useCallback(
    (dev: Device) => {
      if (disposedRef.current) return;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      const interval = nextPollInterval(retryCountRef.current, false);
      pollTimerRef.current = setTimeout(async () => {
        await doFetch(dev);
        schedulePoll(dev);
      }, interval);
    },
    [doFetch],
  );

  const init = useCallback(async () => {
    setIsLoading(true);
    const dev = await loadDevice();
    if (!dev) {
      setIsLoading(false);
      setConnection({
        status: "error",
        message: "No device configured",
        retryCount: 0,
      });
      return;
    }
    const cached = readCachedProjectOverview(dev.baseUrl);
    if (cached) {
      applyProjectOverview(cached);
      setConnection({ status: "connected" });
      setIsLoading(false);
    }
    await doFetch(dev);
    setIsLoading(false);
    schedulePoll(dev);
  }, [loadDevice, doFetch, schedulePoll, applyProjectOverview]);

  useEffect(() => {
    void init();
    return () => {
      disposedRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  async function handleRefresh() {
    if (!device) return;
    retryCountRef.current = 0;
    const toast = await showToast(Toast.Style.Animated, "Refreshing...");
    const result = await doFetch(device);
    schedulePoll(device);
    toast.style = result ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = result ? "Refreshed" : "Refresh failed";
  }

  async function handleSwitchDevice(newId: string) {
    await setActiveDeviceId(newId);
    retryCountRef.current = 0;
    setProjects([]);
    setConnection({ status: "loading" });
    await init();
  }

  const deviceDropdown =
    devices.length > 1 ? (
      <List.Dropdown
        tooltip="Switch Device"
        value={device?.id ?? ""}
        onChange={(id) => void handleSwitchDevice(id)}
      >
        {devices.map((d) => (
          <List.Dropdown.Item key={d.id} title={d.name} value={d.id} />
        ))}
      </List.Dropdown>
    ) : undefined;

  if (!device && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Monitor}
          title="No Device Configured"
          description="Add a T3 Code device first to see your agents."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Device"
                icon={Icon.Plus}
                shortcut={appShortcut("n")}
                target={<AddDeviceInline onDone={init} />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (connection.status === "unauthorized") {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Key, tintColor: Color.Red }}
          title="Session Expired"
          description="Your access token is no longer valid. Open Setup Device to re-pair."
          actions={
            <ActionPanel>
              <Action.Push
                title="Repair Device"
                icon={Icon.RotateClockwise}
                shortcut={appShortcut("p")}
                target={
                  <AddDeviceInline
                    existingDevice={device ?? undefined}
                    onDone={init}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (
    (connection.status === "offline" || connection.status === "error") &&
    projects.length === 0
  ) {
    const msg =
      connection.status === "offline"
        ? "Cannot reach server — is T3 Code running?"
        : connection.message;
    return (
      <List searchBarAccessory={deviceDropdown}>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={`Cannot Reach ${device?.name ?? "Device"}`}
          description={`${msg}\n\nCheck that T3 Code desktop app is open and you're on the same network (or Tailscale is connected).`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                shortcut={appShortcut("r")}
                onAction={() => void handleRefresh()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const visibleProjects = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      searchBarAccessory={deviceDropdown}
    >
      {visibleProjects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tray}
          title={`No Projects on ${device?.name ?? "Device"}`}
          description="Create a project in T3 Code to get started."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={appShortcut("r")}
                onAction={() => void handleRefresh()}
              />
            </ActionPanel>
          }
        />
      ) : (
        visibleProjects.map((project) => {
          const count = threadCounts.get(project.id) ?? 0;
          const running = hasRunning.get(project.id) ?? false;
          return (
            <List.Item
              key={project.id}
              icon={{
                source: Icon.Folder,
                tintColor: running ? Color.Orange : Color.PrimaryText,
              }}
              title={project.title}
              subtitle={project.workspaceRoot}
              accessories={[
                ...(running
                  ? [{ tag: { value: "Running", color: Color.Orange } }]
                  : []),
                { text: `${count} thread${count !== 1 ? "s" : ""}` },
                { text: timeAgo(project.updatedAt) },
              ]}
              keywords={[project.title, project.workspaceRoot]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Project"
                    icon={Icon.ArrowRight}
                    shortcut={appShortcut("return")}
                    target={
                      <ProjectThreads
                        device={device!}
                        projectId={project.id}
                        initialProject={project}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={appShortcut("r")}
                    onAction={() => void handleRefresh()}
                  />
                  <Action.OpenInBrowser
                    title="Open in T3 Code"
                    icon={T3_CODE_ICON}
                    url={t3CodeUrl(device!)}
                    shortcut={appShortcut("o")}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
