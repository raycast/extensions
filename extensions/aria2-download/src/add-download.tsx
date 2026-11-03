import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  LaunchType,
  Toast,
  getPreferenceValues,
  launchCommand,
  getSelectedFinderItems,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { addTorrent, addUri, isDaemonRunning } from "./lib/rpc";
import { startDaemon } from "./lib/engine";
import { isMagnetUri, isNetdiskUrl } from "./lib/netdisk";
import { loadSettingsOrDefaults } from "./lib/state";
import {
  isTorrentPath,
  readTorrentBase64,
  torrentDisplayName,
} from "./lib/torrent";
import { Aria2Settings, ExtensionPreferences } from "./lib/types";

type SourceType = "link" | "torrent";

interface FormValues {
  source: string;
  urls: string;
  torrent: string[];
  directory: string[];
  out: string;
  split: string;
  showAdvanced: boolean;
  userAgent: string;
  referer: string;
  cookie: string;
  authorization: string;
  proxy: string;
  checksum: string;
  seed: boolean;
  pause: boolean;
  navigate: boolean;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildHeaders(values: FormValues): string[] {
  const headers: string[] = [];
  if (values.cookie.trim()) headers.push(`Cookie: ${values.cookie.trim()}`);
  if (values.authorization.trim()) {
    headers.push(`Authorization: ${values.authorization.trim()}`);
  }
  return headers;
}

export default function AddDownload({
  fromTasks = false,
}: { fromTasks?: boolean } = {}) {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { pop } = useNavigation();

  async function afterAdd(): Promise<void> {
    if (fromTasks) {
      pop();
      return;
    }
    await launchCommand({ name: "tasks", type: LaunchType.UserInitiated });
  }
  const [settings, setSettings] = useState<Aria2Settings | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("link");
  const [urls, setUrls] = useState("");
  const [torrent, setTorrent] = useState<string[]>([]);
  const [directory, setDirectory] = useState<string[]>([]);
  const [out, setOut] = useState("");
  const [split, setSplit] = useState("16");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [userAgent, setUserAgent] = useState("");
  const [referer, setReferer] = useState("");
  const [cookie, setCookie] = useState("");
  const [authorization, setAuthorization] = useState("");
  const [proxy, setProxy] = useState("");
  const [checksum, setChecksum] = useState("");
  const [seed, setSeed] = useState(false);
  const [pause, setPause] = useState(false);
  const [navigate, setNavigate] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const loaded = await loadSettingsOrDefaults();
      if (cancelled) return;
      setSettings(loaded);
      setSplit(String(loaded.split));
      setDirectory(loaded.downloadDir ? [loaded.downloadDir] : []);

      let foundTorrent = false;
      try {
        const items = await getSelectedFinderItems();
        const selected = items.find((item) => isTorrentPath(item.path));
        if (selected) {
          setSourceType("torrent");
          setTorrent([selected.path]);
          foundTorrent = true;
        }
      } catch {
        // Explorer selection is optional.
      }

      if (!foundTorrent) {
        try {
          const clipboard = await Clipboard.readText();
          if (
            clipboard &&
            (clipboard.startsWith("http://") ||
              clipboard.startsWith("https://") ||
              isMagnetUri(clipboard))
          ) {
            setSourceType("link");
            setUrls(clipboard);
          }
        } catch {
          // Clipboard access is optional.
        }
      }
      setIsLoading(false);
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function ensureDaemonForAdd(): Promise<boolean> {
    if (await isDaemonRunning()) return true;
    if (settings?.autoStartOnAdd ?? true) {
      await startDaemon();
      // Let Watch-Aria2 initialize its baseline before an instant task can
      // finish, otherwise a very fast download is mistaken for history.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return true;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "aria2 is not running",
      message:
        "Enable 'Start aria2 when adding a download' in Configuration, or start it with Toggle Aria2.",
    });
    return false;
  }

  async function submit(values: FormValues) {
    values = {
      ...values,
      source: sourceType,
      urls,
      torrent,
      directory,
      out,
      split,
      userAgent,
      referer,
      cookie,
      authorization,
      proxy,
      checksum,
      seed,
      pause,
      navigate,
    };

    if (sourceType === "torrent") {
      await submitTorrent(values);
      return;
    }
    await submitLinks(values);
  }

  async function submitTorrent(values: FormValues) {
    const filePath = values.torrent[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a .torrent file",
      });
      return;
    }
    if (!isTorrentPath(filePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "The selected file is not a .torrent",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading torrent…",
    });
    try {
      const base64 = await readTorrentBase64(filePath);
      const options: Record<string, string | string[]> = {};
      if (values.directory.length > 0) options.dir = values.directory[0];
      if (values.pause) options.pause = "true";
      if (values.seed && settings) {
        options["seed-time"] = String(
          settings.seedTime > 0 ? settings.seedTime : 60,
        );
        options["seed-ratio"] = String(settings.seedRatio);
      } else {
        options["seed-time"] = "0";
      }
      if (!(await ensureDaemonForAdd())) return;
      toast.title = "Adding torrent…";
      await addTorrent(base64, options);
      toast.style = Toast.Style.Success;
      toast.title = "Torrent added";
      toast.message = torrentDisplayName(filePath);
      if (values.navigate) await afterAdd();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add torrent";
      toast.message = messageOf(error);
    }
  }

  async function submitLinks(values: FormValues) {
    const lines = values.urls
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter at least one URL or magnet link",
      });
      return;
    }

    const netdisk = lines.find((line) => isNetdiskUrl(line));
    if (netdisk) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Use LinkSwift for netdisk links",
        message:
          "Directly pasting a netdisk URL misses the Cookie/Referer/UA that LinkSwift sends.",
      });
      return;
    }

    const options: Record<string, string | string[]> = {
      "max-connection-per-server": values.split,
      split: values.split,
      "min-split-size": settings?.minSplitSize ?? "1M",
    };
    if (values.directory.length > 0) options.dir = values.directory[0];
    if (values.out.trim() && lines.length === 1) {
      options.out = values.out.trim();
    }
    if (values.userAgent.trim()) {
      options["user-agent"] = values.userAgent.trim();
    }
    if (values.referer.trim()) options.referer = values.referer.trim();
    if (values.proxy.trim()) options["all-proxy"] = values.proxy.trim();
    if (values.checksum.trim()) options.checksum = values.checksum.trim();
    if (values.pause) options.pause = "true";
    const headers = buildHeaders(values);
    if (headers.length > 0) options.header = headers;

    function magnetHasNoTracker(value: string): boolean {
      if (!isMagnetUri(value)) return false;
      try {
        const params = new URL(value).searchParams;
        return !Array.from(params.getAll("tr")).some(Boolean);
      } catch {
        return false;
      }
    }

    function isTorrentUrl(value: string): boolean {
      try {
        const parsed = new URL(value);
        return (
          (parsed.protocol === "http:" || parsed.protocol === "https:") &&
          parsed.pathname.toLowerCase().endsWith(".torrent")
        );
      } catch {
        return false;
      }
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding download…",
    });
    try {
      if (!(await ensureDaemonForAdd())) return;
      for (const line of lines) {
        if (isTorrentUrl(line)) {
          const response = await fetch(line);
          if (!response.ok) {
            throw new Error(
              `Could not download torrent: HTTP ${response.status}`,
            );
          }
          const bytes = Buffer.from(await response.arrayBuffer());
          await addTorrent(bytes.toString("base64"), options);
        } else {
          await addUri([line], options);
        }
      }
      toast.style = Toast.Style.Success;
      toast.title =
        lines.length === 1
          ? "Download added"
          : `${lines.length} downloads added`;
      toast.message =
        lines.length === 1
          ? lines[0].slice(0, 100)
          : `${lines.length} downloads added`;
      if (lines.some(magnetHasNoTracker)) {
        toast.message =
          "Magnet has no tracker; DHT peers are required. Add extra trackers in Configuration if peers stay at 0.";
      }
      if (values.navigate) await afterAdd();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add download";
      toast.message = messageOf(error);
    }
  }

  if (isLoading || !settings) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Download"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Download" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="source"
        title="Source"
        value={sourceType}
        onChange={(value) => setSourceType(value as SourceType)}
      >
        <Form.Dropdown.Item value="link" title="URL / Magnet" />
        <Form.Dropdown.Item value="torrent" title="Torrent File" />
      </Form.Dropdown>

      {sourceType === "link" ? (
        <>
          <Form.TextArea
            id="urls"
            title="URLs"
            placeholder={"https://example.com/file.iso\nmagnet:?xt=urn:btih:…"}
            info="One URL or magnet per line. A magnet without tr= trackers needs DHT peers. Netdisk direct links should be pushed by LinkSwift instead."
            value={urls}
            onChange={setUrls}
          />
          <Form.Description
            text={`RPC: ${preferences.rpcEndpoint || `127.0.0.1:${settings.rpcPort}`} · ${settings.downloadDir}`}
          />
          <Form.TextField
            id="out"
            title="Rename"
            placeholder="Leave empty to use the remote file name"
            value={out}
            onChange={setOut}
          />
          <Form.Dropdown
            id="split"
            title="Connections"
            value={split}
            onChange={setSplit}
          >
            <Form.Dropdown.Item value="1" title="1" />
            <Form.Dropdown.Item value="4" title="4" />
            <Form.Dropdown.Item value="8" title="8" />
            <Form.Dropdown.Item value="16" title="16 (recommended)" />
          </Form.Dropdown>
          <Form.Checkbox
            id="showAdvanced"
            label="Advanced request options"
            value={showAdvanced}
            onChange={setShowAdvanced}
          />
          {showAdvanced && (
            <>
              <Form.Separator />
              <Form.TextField
                id="userAgent"
                title="User-Agent"
                placeholder="Optional. LinkSwift sends its own per task."
                value={userAgent}
                onChange={setUserAgent}
              />
              <Form.TextField
                id="referer"
                title="Referer"
                placeholder="Optional. LinkSwift sends its own per task."
                value={referer}
                onChange={setReferer}
              />
              <Form.PasswordField
                id="cookie"
                title="Cookie"
                placeholder="Optional; keep empty for normal direct links"
                value={cookie}
                onChange={setCookie}
              />
              <Form.PasswordField
                id="authorization"
                title="Authorization"
                placeholder="Optional header value"
                value={authorization}
                onChange={setAuthorization}
              />
              <Form.TextField
                id="proxy"
                title="Proxy"
                placeholder="Optional all-proxy, e.g. http://127.0.0.1:7890"
                value={proxy}
                onChange={setProxy}
              />
              <Form.TextField
                id="checksum"
                title="Checksum"
                placeholder="Optional, e.g. sha-256=…"
                value={checksum}
                onChange={setChecksum}
              />
            </>
          )}
        </>
      ) : (
        <>
          <Form.FilePicker
            id="torrent"
            title="Torrent File"
            value={torrent}
            onChange={(paths) => {
              setTorrent(paths);
              if (paths.length > 0) setSourceType("torrent");
            }}
            canChooseFiles
            canChooseDirectories={false}
            allowMultipleSelection={false}
          />
          <Form.Description
            text={`RPC: ${preferences.rpcEndpoint || `127.0.0.1:${settings.rpcPort}`} · ${settings.downloadDir}`}
          />
          <Form.Checkbox
            id="seed"
            label="Seed after download (respect private tracker rules)"
            value={seed}
            onChange={setSeed}
          />
          <Form.Description text="Seeding is off by default (seed-time=0). BT still uploads while downloading." />
        </>
      )}

      <Form.FilePicker
        id="directory"
        title="Save Directory"
        value={directory}
        onChange={setDirectory}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.Checkbox
        id="pause"
        label="Add as paused"
        value={pause}
        onChange={setPause}
      />
      <Form.Checkbox
        id="navigate"
        label="Open Tasks after adding"
        value={navigate}
        onChange={setNavigate}
      />
    </Form>
  );
}
