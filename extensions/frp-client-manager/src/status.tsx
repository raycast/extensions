import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  confirmRestart,
  confirmStop,
  confirmUpgrade,
  getPrefs,
  hasLaunchdService,
  loadStatusDashboard,
  restartService,
  rollbackPlist,
  startService,
  stopService,
  upgradeFrpc,
  frpDirExists,
  type StatusDashboard,
  type UpdateCheckResult,
} from "./frp";
import { MissingFrpDir } from "./components";

// "frp" is canonically lowercase; a constant keeps the title-case rule quiet
const OPEN_FOLDER_TITLE = "Open frp Folder";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(loadStatusDashboard);
  const managed = hasLaunchdService();

  if (!frpDirExists()) {
    return (
      <List>
        <MissingFrpDir frpDir={getPrefs().frpDir} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter status">
      {data ? (
        <>
          <List.Section title="Service">
            <List.Item
              title="Process"
              subtitle={data.service.running ? "running" : "stopped"}
              icon={{
                source: Icon.CircleFilled,
                tintColor: data.service.running
                  ? Color.Green
                  : Color.SecondaryText,
              }}
              accessories={processAccessories(data)}
              actions={
                <StatusActions
                  data={data}
                  managed={managed}
                  revalidate={revalidate}
                />
              }
            />
            <List.Item
              title="Version"
              subtitle={data.version ?? "unknown"}
              icon={Icon.Tag}
              accessories={data.binaryPath ? [{ text: data.binaryPath }] : []}
              actions={
                <StatusActions
                  data={data}
                  managed={managed}
                  revalidate={revalidate}
                />
              }
            />
          </List.Section>
          <List.Section title="Admin API">
            <List.Item
              title="Connectivity"
              subtitle={
                data.admin.reachable
                  ? "connected"
                  : "unreachable (process-only)"
              }
              icon={{
                source: data.admin.reachable ? Icon.Wifi : Icon.WifiDisabled,
                tintColor: data.admin.reachable ? Color.Green : Color.Orange,
              }}
              accessories={[
                {
                  text: data.admin.reachable
                    ? `${data.admin.online}/${data.admin.total} online`
                    : `${data.admin.total} configured`,
                },
              ]}
              actions={
                <StatusActions
                  data={data}
                  managed={managed}
                  revalidate={revalidate}
                />
              }
            />
          </List.Section>
          <List.Section title="Updates">
            <List.Item
              title={updateTitle(data.update)}
              subtitle={updateSubtitle(data.update)}
              icon={{
                source: data.update.hasUpdate
                  ? Icon.ExclamationMark
                  : Icon.CheckCircle,
                tintColor: data.update.hasUpdate ? Color.Orange : Color.Green,
              }}
              actions={
                <StatusActions
                  data={data}
                  managed={managed}
                  revalidate={revalidate}
                />
              }
            />
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

function StatusActions({
  data,
  managed,
  revalidate,
}: {
  data: StatusDashboard;
  managed: boolean;
  revalidate: () => void;
}) {
  const running = data.service.running;

  return (
    <ActionPanel>
      {managed ? (
        <ActionPanel.Section title="Service">
          {running ? null : (
            <Action
              title="Start"
              icon={Icon.Play}
              onAction={() =>
                runAction("Starting frpc…", startService, revalidate)
              }
            />
          )}
          {running ? (
            <Action
              title="Stop"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={async () => {
                if (!(await confirmStop())) {
                  return;
                }
                await runAction("Stopping frpc…", stopService, revalidate);
              }}
            />
          ) : null}
          {running ? (
            <Action
              title="Restart"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={async () => {
                if (!(await confirmRestart())) {
                  return;
                }
                await runAction("Restarting frpc…", restartService, revalidate);
              }}
            />
          ) : null}
        </ActionPanel.Section>
      ) : null}
      {data.update.hasUpdate &&
      data.update.downloadUrl &&
      data.update.latestVersion ? (
        <ActionPanel.Section title="Updates">
          <Action
            title={`Upgrade to ${data.update.latestVersion}`}
            icon={Icon.Download}
            onAction={() => handleUpgrade(data.update, revalidate)}
          />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action.Open
          title={OPEN_FOLDER_TITLE}
          target={data.frpDir}
          icon={Icon.Folder}
        />
        {data.serverAddress ? (
          <Action.CopyToClipboard
            title="Copy Server Address"
            content={data.serverAddress}
          />
        ) : null}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function processAccessories(data: StatusDashboard) {
  const accessories: { text: string }[] = [];
  if (data.service.pid) {
    accessories.push({ text: `PID ${data.service.pid}` });
  }
  if (data.service.uptimeLabel) {
    accessories.push({ text: data.service.uptimeLabel });
  }
  if (!data.service.managed) {
    accessories.push({ text: "launchd not configured" });
  }
  return accessories;
}

function updateTitle(update: UpdateCheckResult): string {
  if (update.hasUpdate && update.latestVersion) {
    return `Update available: ${update.latestVersion}`;
  }
  return "Up to date";
}

function updateSubtitle(update: UpdateCheckResult): string {
  if (update.hasUpdate && update.latestVersion) {
    return `local ${update.localVersion || "unknown"} → ${update.latestVersion}`;
  }
  return update.localVersion
    ? `local ${update.localVersion}`
    : "version unknown";
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
  const result = await upgradeFrpc(update.downloadUrl, update.latestVersion);
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
