import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  open,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  checkForUpdates,
  confirmRestart,
  confirmStop,
  confirmUpgrade,
  fetchAdminStatus,
  findFrpcBinary,
  flattenAdminStatus,
  frpDirExists,
  getFrpcVersion,
  getPrefs,
  getServiceStatus,
  hasLaunchdService,
  parseFrpcToml,
  getConfigPath,
  resolveLogPath,
  restartService,
  rollbackPlist,
  startService,
  stopService,
  upgradeFrpc,
  type ProxyRuntime,
  type ServiceStatus,
  type UpdateCheckResult,
} from "./frp";

interface MenuSnapshot {
  service: ServiceStatus;
  version: string | undefined;
  adminReachable: boolean;
  proxies: ProxyRuntime[];
  configuredCount: number;
  update: UpdateCheckResult;
  logPath: string;
  managed: boolean;
  dirExists: boolean;
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(loadMenuSnapshot);
  const running = data?.service.running ?? false;
  const online =
    data?.proxies.filter((proxy) => proxy.status === "running").length ?? 0;
  const title = running ? `${online}` : "";

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "menu-icon.png", tintColor: Color.PrimaryText }}
      title={title}
      tooltip={
        running ? `frpc running, ${online} proxies online` : "frpc stopped"
      }
    >
      {data && !data.dirExists ? (
        <MenuBarExtra.Section title="Setup">
          <MenuBarExtra.Item title="frp directory not found — check preferences" />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section title="Service">
        <MenuBarExtra.Item
          title={
            running
              ? `Process: running (PID ${data?.service.pid ?? "?"})`
              : "Process: stopped"
          }
        />
        {data?.service.uptimeLabel ? (
          <MenuBarExtra.Item title={`Uptime: ${data.service.uptimeLabel}`} />
        ) : null}
        <MenuBarExtra.Item title={`Version: ${data?.version ?? "unknown"}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Proxies">
        {(data?.proxies ?? []).map((proxy) => (
          <MenuBarExtra.Item
            key={proxy.name}
            title={`${proxy.name}: ${proxy.status}${proxy.err ? ` (${proxy.err})` : ""}`}
            icon={{
              source:
                proxy.status === "running"
                  ? Icon.CircleFilled
                  : Icon.XMarkCircle,
              tintColor: proxy.status === "running" ? Color.Green : Color.Red,
            }}
          />
        ))}
        {!data?.adminReachable ? (
          <MenuBarExtra.Item title="status unavailable" />
        ) : null}
        {data?.adminReachable && data.proxies.length === 0 ? (
          <MenuBarExtra.Item
            title={`${data.configuredCount} configured, no runtime data`}
          />
        ) : null}
      </MenuBarExtra.Section>
      {data?.update.hasUpdate && data.update.latestVersion ? (
        <MenuBarExtra.Section title="Updates">
          <MenuBarExtra.Item
            title={`New version ${data.update.latestVersion} available`}
          />
          {data.update.downloadUrl ? (
            <MenuBarExtra.Item
              title={`Upgrade to ${data.update.latestVersion}`}
              icon={Icon.Download}
              onAction={() => handleUpgrade(data.update, revalidate)}
            />
          ) : null}
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        {running ? (
          <MenuBarExtra.Item
            title="Restart"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              if (!(await confirmRestart())) {
                return;
              }
              await runAction("Restarting frpc…", restartService, revalidate);
            }}
          />
        ) : null}
        {running ? (
          <MenuBarExtra.Item
            title="Stop"
            icon={Icon.Stop}
            onAction={async () => {
              if (!(await confirmStop())) {
                return;
              }
              await runAction("Stopping frpc…", stopService, revalidate);
            }}
          />
        ) : data?.managed ? (
          <MenuBarExtra.Item
            title="Start"
            icon={Icon.Play}
            onAction={() =>
              runAction("Starting frpc…", startService, revalidate)
            }
          />
        ) : null}
        <MenuBarExtra.Item
          title="Open frpc Logs"
          icon={Icon.Document}
          onAction={() => openLogs(data?.logPath)}
        />
        <MenuBarExtra.Item
          title="Check for Updates"
          icon={Icon.MagnifyingGlass}
          onAction={() => handleCheckUpdates(data?.version, revalidate)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function loadMenuSnapshot(): Promise<MenuSnapshot> {
  const prefs = getPrefs();
  const dirExists = frpDirExists();
  const binaryPath = dirExists ? await findFrpcBinary(prefs.frpDir) : undefined;
  const [service, version, adminStatus, config, logPath] = await Promise.all([
    getServiceStatus(),
    binaryPath ? getFrpcVersion(binaryPath) : Promise.resolve(undefined),
    fetchAdminStatus(),
    dirExists
      ? parseFrpcToml(getConfigPath(prefs.frpDir)).catch(() => undefined)
      : Promise.resolve(undefined),
    dirExists ? resolveLogPath(prefs.frpDir) : Promise.resolve(""),
  ]);
  const proxies = flattenAdminStatus(adminStatus);
  const update = await checkForUpdates(version ?? "");
  return {
    service,
    version,
    adminReachable: Boolean(adminStatus),
    proxies,
    configuredCount: config
      ? config.proxies.length + config.visitors.length
      : 0,
    update,
    logPath,
    managed: hasLaunchdService(),
    dirExists,
  };
}

async function openLogs(logPath: string | undefined) {
  try {
    await launchCommand({ name: "logs", type: LaunchType.UserInitiated });
  } catch {
    if (logPath) {
      await open(logPath);
    }
  }
}

async function handleCheckUpdates(
  localVersion: string | undefined,
  revalidate: () => void,
) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking for updates…",
  });
  const result = await checkForUpdates(localVersion ?? "", true);
  if (result.hasUpdate && result.latestVersion) {
    toast.style = Toast.Style.Success;
    toast.title = `Update available: ${result.latestVersion}`;
    toast.message = `local ${result.localVersion || "unknown"}`;
  } else {
    toast.style = Toast.Style.Success;
    toast.title = "Up to date";
    toast.message = result.localVersion || "version unknown";
  }
  revalidate();
}

async function handleUpgrade(
  update: UpdateCheckResult,
  revalidate: () => void,
) {
  if (!update.downloadUrl || !update.latestVersion) {
    return;
  }
  if (!(await confirmUpgrade(update.latestVersion))) {
    return;
  }
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Upgrading to ${update.latestVersion}…`,
  });
  const result = await upgradeFrpc(
    update.downloadUrl,
    update.latestVersion,
    update.digest,
  );
  if (result.ok) {
    toast.style = Toast.Style.Success;
    toast.title = "Upgrade complete";
    toast.message = result.message;
    revalidate();
    return;
  }
  toast.style = Toast.Style.Failure;
  toast.title = "Upgrade failed";
  toast.message = result.message;
  toast.primaryAction = {
    title: "Rollback Plist",
    onAction: async () => {
      const rolled = await rollbackPlist();
      await showToast({
        style: rolled.ok ? Toast.Style.Success : Toast.Style.Failure,
        title: rolled.ok ? "Rolled back" : "Rollback failed",
        message: rolled.message,
      });
      revalidate();
    },
  };
}

async function runAction(
  title: string,
  action: () => Promise<void>,
  revalidate: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = "Done";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
