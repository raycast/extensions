import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  Toast,
  confirmAlert,
  open,
  showToast,
} from "@raycast/api";

import { showFailureToast, useCachedPromise } from "@raycast/utils";

import { getVersion, isDaemonRunning } from "./lib/rpc";
import { restartDaemon, saveSettings, stopDaemon } from "./lib/engine";
import { loadSettingsOrDefaults, readSecret } from "./lib/state";
import { validateSettings } from "./lib/settings";
import { Aria2Settings } from "./lib/types";

interface ConfigurationValues {
  rpcPort: string;
  downloadDir: string[];
  connections: string;
  split: string;
  minSplitSize: string;
  maxConcurrentDownloads: string;
  fileAllocation: string;
  diskCache: string;
  maxOverallDownloadLimit: string;
  maxOverallUploadLimit: string;
  proxyMode: string;
  allProxy: string;
  noProxy: string;
  checkCertificate: boolean;
  connectTimeout: string;
  timeout: string;
  maxTries: string;
  retryWait: string;
  lowestSpeedLimit: string;
  saveSessionInterval: string;
  notifications: boolean;
  autoStartOnAdd: boolean;
  autoStopWhenIdle: boolean;
  listenPort: string;
  dhtListenPort: string;
  enableDht: boolean;
  enablePeerExchange: boolean;
  btEnableLpd: boolean;
  btMaxPeers: string;
  btRequireCrypto: boolean;
  seedTime: string;
  seedRatio: string;
  btSaveMetadata: boolean;
  btLoadSavedMetadata: boolean;
  rpcSaveUploadMetadata: boolean;
  btTracker: string;
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSettings(
  values: ConfigurationValues,
  current: Aria2Settings,
): Aria2Settings {
  return {
    ...current,
    rpcPort: toNumber(values.rpcPort, current.rpcPort),
    downloadDir: values.downloadDir?.[0] ?? current.downloadDir,
    connections: toNumber(values.connections, current.connections),
    split: toNumber(values.split, current.split),
    minSplitSize: values.minSplitSize,
    maxConcurrentDownloads: toNumber(
      values.maxConcurrentDownloads,
      current.maxConcurrentDownloads,
    ),
    fileAllocation: values.fileAllocation === "prealloc" ? "prealloc" : "none",
    diskCache: values.diskCache,
    maxOverallDownloadLimit: values.maxOverallDownloadLimit.trim() || "0",
    maxOverallUploadLimit: values.maxOverallUploadLimit.trim() || "0",
    proxyMode:
      values.proxyMode === "direct" || values.proxyMode === "custom"
        ? values.proxyMode
        : "system",
    allProxy: values.allProxy.trim(),
    noProxy: values.noProxy.trim(),
    checkCertificate: values.checkCertificate,
    connectTimeout: toNumber(values.connectTimeout, current.connectTimeout),
    timeout: toNumber(values.timeout, current.timeout),
    maxTries: toNumber(values.maxTries, current.maxTries),
    retryWait: toNumber(values.retryWait, current.retryWait),
    lowestSpeedLimit: values.lowestSpeedLimit.trim() || "0",
    saveSessionInterval: toNumber(
      values.saveSessionInterval,
      current.saveSessionInterval,
    ),
    notifications: values.notifications,
    autoStartOnAdd: values.autoStartOnAdd ?? current.autoStartOnAdd,
    autoStopWhenIdle: values.autoStopWhenIdle ?? current.autoStopWhenIdle,
    listenPort: toNumber(values.listenPort, current.listenPort),
    dhtListenPort: toNumber(values.dhtListenPort, current.dhtListenPort),
    enableDht: values.enableDht,
    enablePeerExchange: values.enablePeerExchange,
    btEnableLpd: values.btEnableLpd,
    btMaxPeers: toNumber(values.btMaxPeers, current.btMaxPeers),
    btRequireCrypto: values.btRequireCrypto,
    seedTime: toNumber(values.seedTime, current.seedTime),
    seedRatio: toNumber(values.seedRatio, current.seedRatio),
    btSaveMetadata: values.btSaveMetadata,
    btLoadSavedMetadata: values.btLoadSavedMetadata,
    rpcSaveUploadMetadata: values.rpcSaveUploadMetadata,
    btTracker: values.btTracker.trim(),
  };
}

export default function Configuration() {
  const {
    data: loadedSettings,
    isLoading,
    revalidate,
  } = useCachedPromise(loadSettingsOrDefaults, []);
  const settings = loadedSettings ?? null;

  async function submit(values: ConfigurationValues) {
    if (!settings) return;
    const next = toSettings(values, settings);
    const errors = validateSettings(next);
    if (errors.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid aria2 configuration",
        message: errors.join("; "),
      });
      return;
    }

    let stoppedForPortChange = false;
    if (next.rpcPort !== settings.rpcPort && (await isDaemonRunning())) {
      try {
        await stopDaemon({ onlyIfIdle: true });
        stoppedForPortChange = true;
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Stop aria2 before changing the RPC port",
          message:
            "The daemon has active or queued downloads. Stop it only after they are idle.",
        });
        return;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving aria2 configuration…",
    });
    try {
      const result = await saveSettings(next);
      await revalidate();
      toast.style = Toast.Style.Success;
      toast.title = stoppedForPortChange
        ? "Saved; aria2 stopped to apply the port"
        : result.restartRequired
          ? "Saved; restart aria2 to apply"
          : "Saved";
      toast.message = result.restartRequired
        ? "Port, split, directory and BT options need a daemon restart."
        : "";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not save configuration" });
    }
  }

  async function testConnection() {
    try {
      const version = await getVersion();
      await showToast({
        style: Toast.Style.Success,
        title: "aria2 connected",
        message: `aria2 ${version.version}`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "aria2 RPC is not available" });
    }
  }

  async function restart() {
    const confirmed = await confirmAlert({
      title: "Restart aria2?",
      message:
        "Active downloads will be interrupted. aria2 will save its session and try to restore unfinished tasks.",
      primaryAction: { title: "Restart", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restarting aria2…",
    });
    try {
      await restartDaemon();
      toast.style = Toast.Style.Success;
      toast.title = "aria2 restarted";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not restart aria2" });
    }
  }

  async function copySecret(): Promise<void> {
    const secret = await readSecret();
    if (!secret) {
      await showToast({
        style: Toast.Style.Failure,
        title: "RPC secret not found",
      });
      return;
    }
    await Clipboard.copy(secret, { concealed: true });
    await showToast({
      style: Toast.Style.Success,
      title: "RPC secret copied",
      message: "Paste it into LinkSwift or another RPC client.",
    });
  }

  if (isLoading || !settings) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={submit} />
          <Action
            title="Test Connection"
            icon={Icon.Checkmark}
            onAction={testConnection}
          />
          <Action
            title="Restart Aria2"
            icon={Icon.ArrowClockwise}
            onAction={restart}
          />
          <Action
            title="Copy RPC Secret"
            icon={Icon.Key}
            onAction={copySecret}
          />
          <Action
            title="Open Download Folder"
            icon={Icon.Folder}
            onAction={() => open(settings.downloadDir)}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="These are aria2 settings, not Raycast UI preferences. Changes are written to the engine settings.json." />
      <Form.TextField
        id="rpcPort"
        title="RPC Port"
        placeholder="6800"
        defaultValue={String(settings.rpcPort)}
      />
      <Form.Description text="Changing the RPC port or secret requires updating LinkSwift too." />
      <Form.FilePicker
        id="downloadDir"
        title="Download Directory"
        defaultValue={[settings.downloadDir]}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="connections"
        title="Connections per Server"
        placeholder="16"
        defaultValue={String(settings.connections)}
      />
      <Form.TextField
        id="split"
        title="Split"
        placeholder="16"
        defaultValue={String(settings.split)}
      />
      <Form.Dropdown
        id="minSplitSize"
        title="Min Split Size"
        defaultValue={settings.minSplitSize}
      >
        <Form.Dropdown.Item value="1M" title="1M (recommended)" />
        <Form.Dropdown.Item value="4M" title="4M" />
        <Form.Dropdown.Item value="20M" title="20M" />
      </Form.Dropdown>
      <Form.Dropdown
        id="maxConcurrentDownloads"
        title="Max Concurrent Downloads"
        placeholder="3"
        defaultValue={String(settings.maxConcurrentDownloads)}
      >
        {[1, 2, 3, 5, 10].map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={String(value)}
            title={String(value)}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="fileAllocation"
        title="File Allocation"
        defaultValue={settings.fileAllocation}
      >
        <Form.Dropdown.Item value="none" title="none" />
        <Form.Dropdown.Item
          value="prealloc"
          title="prealloc (writes zeros; slower)"
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="diskCache"
        title="Disk Cache"
        defaultValue={settings.diskCache}
      >
        <Form.Dropdown.Item value="16M" title="16M" />
        <Form.Dropdown.Item value="64M" title="64M" />
        <Form.Dropdown.Item value="128M" title="128M" />
      </Form.Dropdown>
      <Form.TextField
        id="maxOverallDownloadLimit"
        title="Max Overall Download"
        placeholder="0 (unlimited)"
        defaultValue={settings.maxOverallDownloadLimit}
      />
      <Form.TextField
        id="maxOverallUploadLimit"
        title="Max Overall Upload"
        placeholder="2M"
        defaultValue={settings.maxOverallUploadLimit}
      />

      <Form.Separator />
      <Form.Description text="Network and proxy" />
      <Form.Dropdown
        id="proxyMode"
        title="Proxy Mode"
        defaultValue={settings.proxyMode}
      >
        <Form.Dropdown.Item
          value="system"
          title="System proxy / Clash rules (recommended for LinkSwift)"
        />
        <Form.Dropdown.Item value="direct" title="Direct (all-proxy=)" />
        <Form.Dropdown.Item value="custom" title="Custom proxy" />
      </Form.Dropdown>
      <Form.TextField
        id="allProxy"
        title="All Proxy"
        placeholder="http://127.0.0.1:7890"
        defaultValue={settings.allProxy}
      />
      <Form.TextField
        id="noProxy"
        title="No Proxy"
        placeholder="localhost,127.0.0.1,::1"
        defaultValue={settings.noProxy}
      />
      <Form.Checkbox
        id="checkCertificate"
        label="Verify HTTPS certificates"
        defaultValue={settings.checkCertificate}
      />
      <Form.TextField
        id="connectTimeout"
        title="Connect Timeout (s)"
        placeholder="30"
        defaultValue={String(settings.connectTimeout)}
      />
      <Form.TextField
        id="timeout"
        title="Timeout (s)"
        placeholder="60"
        defaultValue={String(settings.timeout)}
      />
      <Form.TextField
        id="maxTries"
        title="Max Tries"
        placeholder="3"
        defaultValue={String(settings.maxTries)}
      />
      <Form.TextField
        id="retryWait"
        title="Retry Wait (s)"
        placeholder="5"
        defaultValue={String(settings.retryWait)}
      />
      <Form.TextField
        id="lowestSpeedLimit"
        title="Lowest Speed Limit"
        placeholder="0"
        defaultValue={settings.lowestSpeedLimit}
      />

      <Form.Separator />
      <Form.Description text="BitTorrent" />
      <Form.TextField
        id="listenPort"
        title="BT Listen Port"
        placeholder="6881"
        defaultValue={String(settings.listenPort)}
      />
      <Form.TextField
        id="dhtListenPort"
        title="DHT Listen Port"
        placeholder="6881"
        defaultValue={String(settings.dhtListenPort)}
      />
      <Form.TextField
        id="btMaxPeers"
        title="Max Peers"
        placeholder="55"
        defaultValue={String(settings.btMaxPeers)}
      />
      <Form.Checkbox
        id="enableDht"
        label="Enable DHT"
        defaultValue={settings.enableDht}
      />
      <Form.Checkbox
        id="enablePeerExchange"
        label="Enable Peer Exchange"
        defaultValue={settings.enablePeerExchange}
      />
      <Form.Checkbox
        id="btEnableLpd"
        label="Enable Local Peer Discovery"
        defaultValue={settings.btEnableLpd}
      />
      <Form.Checkbox
        id="btRequireCrypto"
        label="Require encrypted peers"
        defaultValue={settings.btRequireCrypto}
      />
      <Form.Checkbox
        id="btSaveMetadata"
        label="Save magnet metadata"
        defaultValue={settings.btSaveMetadata}
      />
      <Form.Checkbox
        id="btLoadSavedMetadata"
        label="Load saved metadata"
        defaultValue={settings.btLoadSavedMetadata}
      />
      <Form.Checkbox
        id="rpcSaveUploadMetadata"
        label="Save uploaded torrent metadata for session restore"
        defaultValue={settings.rpcSaveUploadMetadata}
      />
      <Form.TextField
        id="seedTime"
        title="Seed Time (minutes, 0 = off)"
        placeholder="0"
        defaultValue={String(settings.seedTime)}
      />
      <Form.TextField
        id="seedRatio"
        title="Seed Ratio"
        placeholder="1.0"
        defaultValue={String(settings.seedRatio)}
      />
      <Form.TextArea
        id="btTracker"
        title="Extra Trackers"
        placeholder="One tracker per line"
        defaultValue={settings.btTracker}
      />

      <Form.Separator />
      <Form.Description text="Session and notifications" />
      <Form.TextField
        id="saveSessionInterval"
        title="Save Session Interval (s)"
        placeholder="30"
        defaultValue={String(settings.saveSessionInterval)}
      />
      <Form.Checkbox
        id="notifications"
        label="Completion / error hooks (Windows Toast)"
        defaultValue={settings.notifications}
      />
      <Form.Checkbox
        id="autoStartOnAdd"
        label="Start aria2 when adding a download"
        defaultValue={settings.autoStartOnAdd}
      />
      <Form.Checkbox
        id="autoStopWhenIdle"
        label="Stop aria2 after all downloads finish"
        defaultValue={settings.autoStopWhenIdle}
      />
    </Form>
  );
}
