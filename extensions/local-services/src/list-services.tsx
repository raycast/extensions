import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  captureException,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { LocalService, ProcessType, ServiceSource } from "./types";
import { getListeningPorts } from "./port-scanner";
import { getDockerContainers, isDockerAvailable } from "./docker-scanner";
import { getHostsEntries } from "./hosts-scanner";
import { getComposeServices } from "./compose-scanner";

const execFileAsync = promisify(execFile);

// -- Icon mapping per process type --

const PROCESS_ICONS: Record<ProcessType, { source: Icon; tintColor: Color }> = {
  node: { source: Icon.Code, tintColor: Color.Green },
  python: { source: Icon.Code, tintColor: Color.Yellow },
  ruby: { source: Icon.Code, tintColor: Color.Red },
  go: { source: Icon.Code, tintColor: Color.Blue },
  java: { source: Icon.Code, tintColor: Color.Orange },
  php: { source: Icon.Code, tintColor: Color.Purple },
  rust: { source: Icon.Code, tintColor: Color.Red },
  docker: { source: Icon.Box, tintColor: Color.Blue },
  other: { source: Icon.Globe, tintColor: Color.SecondaryText },
};

const SOURCE_LABELS: Record<ServiceSource, string> = {
  lsof: "System",
  docker: "Docker",
  hosts: "/etc/hosts",
  compose: "Compose",
};

// -- Fetch all services from every source --

async function fetchAllServices(): Promise<LocalService[]> {
  const prefs = getPreferenceValues<Preferences>();

  // Parse ignored ports
  const ignoredPorts = new Set(
    prefs.ignoredPorts
      ? prefs.ignoredPorts
          .split(",")
          .map((p) => parseInt(p.trim(), 10))
          .filter((n) => !isNaN(n))
      : [],
  );

  // Phase 1: launch all live scanners in parallel (lsof, docker, hosts)
  type DockerResult = { available: boolean; services: LocalService[] };

  const dockerPromise: Promise<DockerResult> = prefs.enableDocker
    ? isDockerAvailable().then(async (available) => ({
        available,
        services: available ? await getDockerContainers() : [],
      }))
    : Promise.resolve({ available: false, services: [] });

  const [portsServices, dockerResult, hostsServices] = await Promise.all([
    getListeningPorts(),
    dockerPromise,
    prefs.scanHosts ? getHostsEntries() : Promise.resolve([]),
  ]);

  const dockerAvailable = dockerResult.available;

  if (prefs.enableDocker && !dockerAvailable) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Docker not running",
      message: "Start Docker Desktop to see container services.",
    });
  }

  const liveServices = [...portsServices, ...dockerResult.services, ...hostsServices];

  // Collect running ports so compose scanner can skip them
  const runningPorts = new Set(liveServices.map((s) => s.port));

  // Phase 2: compose scanner runs after, aware of what's already up
  let composeServices: LocalService[] = [];
  if (prefs.scanCompose && dockerAvailable) {
    composeServices = await getComposeServices(runningPorts);
  }

  const allServices = [...liveServices, ...composeServices];

  // Filter ignored ports
  const filtered = allServices.filter((s) => !ignoredPorts.has(s.port));

  // Deduplicate running services: if a port appears in both lsof and docker, prefer docker
  const byPort = new Map<number, LocalService>();
  const nonPortServices: LocalService[] = []; // hosts + compose entries kept separate

  for (const service of filtered) {
    if (service.source === "hosts" || service.source === "compose") {
      nonPortServices.push(service);
      continue;
    }
    const existing = byPort.get(service.port);
    if (!existing || service.source === "docker") {
      byPort.set(service.port, service);
    }
  }

  const deduped = [...byPort.values(), ...nonPortServices];

  // Sort: running first, then stopped, then declared. Within each group, by port.
  const statusOrder: Record<string, number> = { running: 0, stopped: 1, declared: 2 };
  return deduped.sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (statusDiff !== 0) return statusDiff;
    return a.port - b.port;
  });
}

// -- Build the URL for a service --

function getServiceUrl(service: LocalService): string {
  const host = service.hostname || "localhost";
  if (service.port === 80) return `http://${host}`;
  if (service.port === 443) return `https://${host}`;
  return `http://${host}:${service.port}`;
}

// -- Kill a process or stop a container --

async function stopService(service: LocalService) {
  if (service.source === "docker" && service.containerId) {
    const confirmed = await confirmAlert({
      title: "Stop Docker Container",
      message: `Stop container "${service.containerName}"?`,
      primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await showToast({ style: Toast.Style.Animated, title: "Stopping container..." });
    try {
      await execFileAsync("docker", ["stop", service.containerId]);
      await showToast({ style: Toast.Style.Success, title: "Container stopped" });
    } catch (e) {
      captureException(e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Failed to stop container", message: errorMsg });
    }
  } else if (service.pid) {
    const confirmed = await confirmAlert({
      title: "Kill Process",
      message: `Kill "${service.processName}" (PID ${service.pid}) on port ${service.port}?`,
      primaryAction: { title: "Kill", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await showToast({ style: Toast.Style.Animated, title: "Killing process..." });
    try {
      await execFileAsync("/bin/kill", [String(service.pid)]);
      await showToast({ style: Toast.Style.Success, title: "Process killed" });
    } catch (e) {
      captureException(e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      await showToast({ style: Toast.Style.Failure, title: "Failed to kill process", message: errorMsg });
    }
  }
}

// -- Start a stopped compose service --

async function startComposeService(service: LocalService) {
  if (!service.composeFile) return;

  const dir = service.composeFile.replace(/\/[^/]+$/, "");
  await showToast({ style: Toast.Style.Animated, title: `Starting ${service.composeName}...` });
  try {
    await execFileAsync(
      "docker",
      ["compose", "-f", service.composeFile, "up", "-d", ...(service.composeName ? [service.composeName] : [])],
      { cwd: dir },
    );
    await showToast({ style: Toast.Style.Success, title: `${service.composeName} started` });
  } catch (e) {
    captureException(e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    await showToast({ style: Toast.Style.Failure, title: "Failed to start service", message: errorMsg });
  }
}

// -- Main Command Component --

export default function ListServicesCommand() {
  const { data: services, isLoading, revalidate } = usePromise(fetchAllServices);

  // Group services by status/source for sections
  const running = services?.filter((s) => s.status === "running" && s.source !== "docker") || [];
  const docker = services?.filter((s) => s.source === "docker" && s.status === "running") || [];
  const stopped = services?.filter((s) => s.status === "stopped") || [];
  const declared = services?.filter((s) => s.status === "declared") || [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter services by name, port, or type...">
      {running.length > 0 && (
        <List.Section title="Running Services" subtitle={`${running.length}`}>
          {running.map((service) => (
            <ServiceListItem
              key={service.id}
              service={service}
              onStop={stopService}
              onStart={startComposeService}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {docker.length > 0 && (
        <List.Section title="Docker Containers" subtitle={`${docker.length}`}>
          {docker.map((service) => (
            <ServiceListItem
              key={service.id}
              service={service}
              onStop={stopService}
              onStart={startComposeService}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {declared.length > 0 && (
        <List.Section title="Declared (/etc/hosts)" subtitle={`${declared.length}`}>
          {declared.map((service) => (
            <ServiceListItem
              key={service.id}
              service={service}
              onStop={stopService}
              onStart={startComposeService}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {stopped.length > 0 && (
        <List.Section title="Stopped (from Compose)" subtitle={`${stopped.length}`}>
          {stopped.map((service) => (
            <ServiceListItem
              key={service.id}
              service={service}
              onStop={stopService}
              onStart={startComposeService}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}

      {!isLoading && services?.length === 0 && (
        <List.EmptyView
          title="No Local Services Found"
          description="No services are currently listening on localhost."
          icon={Icon.Globe}
        />
      )}
    </List>
  );
}

// -- Individual list item --

function ServiceListItem({
  service,
  onStop,
  onStart,
  onRefresh,
}: {
  service: LocalService;
  onStop: (service: LocalService) => Promise<void>;
  onStart: (service: LocalService) => Promise<void>;
  onRefresh: () => void;
}) {
  const url = getServiceUrl(service);
  const icon = PROCESS_ICONS[service.processType];

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: SOURCE_LABELS[service.source],
        color:
          service.source === "docker" ? Color.Blue : service.source === "compose" ? Color.Purple : Color.SecondaryText,
      },
    },
  ];

  if (service.status === "stopped") {
    accessories.push({ tag: { value: "stopped", color: Color.Orange } });
  }

  accessories.push({ text: `:${service.port}` });

  if (service.pid) {
    accessories.push({ text: `PID ${service.pid}`, tooltip: `Process ID: ${service.pid}` });
  }

  // Subtitle: show image for docker, hostname for hosts, compose file for compose
  let subtitle: string | undefined;
  if (service.source === "docker" && service.containerImage) {
    subtitle = service.containerImage;
  } else if (service.source === "hosts") {
    subtitle = service.address;
  } else if (service.source === "compose" && service.composeFile) {
    // Show shortened path
    const home = process.env.HOME || "";
    subtitle = service.composeFile.replace(home, "~");
  }

  return (
    <List.Item
      title={service.processName}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      keywords={[
        service.processName,
        String(service.port),
        service.processType,
        service.source,
        service.containerImage || "",
        service.hostname || "",
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            {service.status === "running" && <Action.OpenInBrowser title="Open in Browser" url={url} />}
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            {service.status === "stopped" && service.composeFile && (
              <Action
                title="Start with Docker Compose"
                icon={Icon.Play}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={async () => {
                  await onStart(service);
                  onRefresh();
                }}
              />
            )}
            {(service.pid || service.containerId) && service.status === "running" && (
              <Action
                title={service.source === "docker" ? "Stop Container" : "Kill Process"}
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={async () => {
                  await onStop(service);
                  onRefresh();
                }}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Info">
            <Action.CopyToClipboard
              title="Copy Port"
              content={String(service.port)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            {service.pid && <Action.CopyToClipboard title="Copy PID" content={String(service.pid)} />}
            {service.composeFile && <Action.Open title="Open Compose File" target={service.composeFile} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
