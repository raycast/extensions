import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  ago,
  Device,
  displayName,
  forgetDevice,
  ipSortKey,
  isScanRunning,
  readNames,
  readState,
  shouldAutoScan,
  startScan,
  State,
  writeName,
  customName,
} from "./lib";

type Filter = "all" | "online" | "offline" | "new" | "ports";

function typeIcon(d: Device): Icon {
  const t = (d.type ?? "").toLowerCase();
  if (d.isSelf) return Icon.Monitor;
  if (d.isGateway || t.includes("network")) return Icon.Wifi;
  if (t.includes("iphone") || t.includes("ipad") || t.includes("phone")) return Icon.Mobile;
  if (t.includes("mac") || t.includes("pc") || t.includes("linux")) return Icon.Monitor;
  if (t.includes("tv") || t.includes("chromecast") || t.includes("plex")) return Icon.Video;
  if (t.includes("printer")) return Icon.Print;
  if (t.includes("camera")) return Icon.Camera;
  if (t.includes("home assistant")) return Icon.House;
  if (t.includes("tuya")) return Icon.Plug;
  if (t.includes("iot") || t.includes("raspberry") || d.firmware) return Icon.LightBulb;
  if (t.includes("echo") || t.includes("homepod")) return Icon.Speaker;
  if (t.includes("nas")) return Icon.HardDrive;
  return Icon.Dot;
}

function webUrl(d: Device): string | null {
  const ports = new Set((d.ports ?? []).map((p) => p.port));
  if (ports.has(443)) return `https://${d.ip}`;
  if (ports.has(80)) return `http://${d.ip}`;
  const web = (d.ports ?? []).find((p) => /http/.test(p.service ?? ""));
  if (!web) return null;
  return `${/https|ssl/.test(web.service ?? "") || web.port === 8443 ? "https" : "http"}://${d.ip}:${web.port}`;
}

type LaunchContext = { filter?: Filter; showDetail?: boolean; selected?: string };

const LABELS: Record<string, string> = { ota: "OTA", rssi: "Wi-Fi RSSI", chipID: "Chip ID", leds: "LEDs" };
const labelOf = (k: string) => LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);

// text from devices on the network: strip markdown/HTML control characters before rendering
const safe = (t: string | null | undefined) =>
  (t ?? "")
    .replace(/[\\`*_[\]()<>!#|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const ctx = props.launchContext ?? {};
  const [state, setState] = useState<State>(() => readState());
  const [names, setNames] = useState<Record<string, string>>(() => readNames());
  const [running, setRunning] = useState(() => isScanRunning());
  const [filter, setFilter] = useState<Filter>(ctx.filter ?? "all");
  const [showDetail, setShowDetail] = useState(ctx.showDetail ?? false);
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");

  const reload = () => {
    setState(readState());
    setNames(readNames());
    setRunning(isScanRunning());
  };

  useEffect(() => {
    if (shouldAutoScan(readState())) {
      startScan();
      setRunning(true);
    }
  }, []);

  // poll the state file while a scan runs (and a bit slower otherwise, a scan can be started by the interval command)
  useEffect(() => {
    const t = setInterval(reload, running ? 1500 : 5000);
    return () => clearInterval(t);
  }, [running]);

  const scan = state.scan;
  const devices = useMemo(() => {
    const all = Object.values(state.devices);
    const dayAgo = Date.now() - 24 * 3600_000;
    return all.filter((d) => {
      if (filter === "online") return d.online;
      if (filter === "offline") return !d.online;
      if (filter === "new") return d.firstSeen > dayAgo;
      if (filter === "ports") return (d.ports?.length ?? 0) > 0;
      return true;
    });
  }, [state, filter]);

  const online = devices.filter((d) => d.online).sort((a, b) => ipSortKey(a.ip) - ipSortKey(b.ip));
  const offline = devices.filter((d) => !d.online).sort((a, b) => b.lastSeen - a.lastSeen);

  const runScan = async (opts: { forcePorts?: boolean; host?: string } = {}) => {
    const ok = startScan(opts);
    setRunning(ok || isScanRunning());
    await showToast(
      ok
        ? {
            style: Toast.Style.Success,
            title: opts.host ? `Scanning ${opts.host}` : "Scan started",
            message: "Runs in background, you can close Raycast",
          }
        : { style: Toast.Style.Failure, title: "A scan is already running" },
    );
  };

  const status = running
    ? `Scanning… ${scan?.phase ?? ""} ${scan?.total ? `${scan.done ?? 0}/${scan.total}` : ""}`
    : scan?.error
      ? `Last scan failed: ${scan.error}`
      : `Last scan ${ago(state.lastFullScanAt ?? scan?.finishedAt)} · ${state.network?.cidr ?? ""}`;

  const globalActions = (
    <>
      <Action
        title="Scan Now"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => runScan()}
      />
      <Action
        title="Full Scan (Re-Scan All Ports)"
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={() => runScan({ forcePorts: true })}
      />
      <Action
        title={showDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowDetail((v) => !v)}
      />
      <Action
        title="Settings (Background Scan, Intervals)"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </>
  );

  const item = (d: Device) => {
    const name = displayName(d, names);
    const portCount = d.ports?.length ?? 0;
    const url = webUrl(d);
    const accessories: List.Item.Accessory[] = showDetail
      ? [{ icon: { source: Icon.CircleFilled, tintColor: d.online ? Color.Green : Color.SecondaryText } }]
      : [
          ...(d.scanningPorts ? [{ icon: Icon.Hourglass, tooltip: "Scanning ports…" }] : []),
          ...(portCount ? [{ text: plural(portCount, "port"), tooltip: d.ports!.map((p) => p.port).join(", ") }] : []),
          ...(d.vendor ? [{ text: d.vendor.length > 22 ? d.vendor.slice(0, 21) + "…" : d.vendor }] : []),
          d.online
            ? { tag: { value: "online", color: Color.Green }, tooltip: `First seen ${ago(d.firstSeen)}` }
            : {
                tag: { value: ago(d.lastSeen), color: Color.SecondaryText },
                tooltip: `Last seen ${new Date(d.lastSeen).toLocaleString()}`,
              },
        ];
    return (
      <List.Item
        key={d.key}
        id={d.key}
        icon={{ source: typeIcon(d), tintColor: d.online ? Color.PrimaryText : Color.SecondaryText }}
        title={name}
        subtitle={
          showDetail
            ? d.ip
            : [
                d.ip,
                d.type && d.type !== name ? d.type : null,
                d.firmware?.kind === "Tuya" ? null : d.firmware?.version,
              ]
                .filter(Boolean)
                .join(" · ")
        }
        keywords={[
          d.ip,
          d.mac ?? "",
          d.vendor ?? "",
          d.hostname ?? "",
          d.mdnsName ?? "",
          d.type ?? "",
          d.firmware?.kind ?? "",
          d.firmware?.name ?? "",
          d.firmware?.id ?? "",
          d.firmware?.model ?? "",
          ...(d.ports ?? []).flatMap((p) => [String(p.port), p.service ?? "", p.product ?? ""]),
        ].filter(Boolean)}
        accessories={accessories}
        detail={<DeviceDetail d={d} name={name} />}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.CopyToClipboard title="Copy IP" content={d.ip} />
              {url && (
                <Action.OpenInBrowser title="Open Web Interface" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
              )}
              {d.ports?.some((p) => p.port === 22) && (
                <Action.Open
                  title="SSH"
                  icon={Icon.Terminal}
                  target={`ssh://${d.ip}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                />
              )}
              {d.mac && (
                <Action.CopyToClipboard title="Copy MAC" content={d.mac} shortcut={Keyboard.Shortcut.Common.Copy} />
              )}
              {d.firmware?.id && <Action.CopyToClipboard title="Copy Device ID" content={d.firmware.id} />}
            </ActionPanel.Section>
            <ActionPanel.Section>{globalActions}</ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Re-Scan This Device"
                icon={Icon.Repeat}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => runScan({ host: d.ip })}
              />
              <Action.Push
                title="Rename"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<RenameForm d={d} current={customName(d, names) ?? ""} onDone={reload} />}
              />
              <Action
                title="Forget Device"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      title: `Forget ${name}?`,
                      primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
                    }))
                  )
                    return;
                  if (!forgetDevice(d.key))
                    await showToast({ style: Toast.Style.Failure, title: "Wait until the scan finishes" });
                  reload();
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={running}
      isShowingDetail={showDetail}
      filtering
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={ctx.selected}
      searchBarPlaceholder="Filter by IP, name, vendor, MAC, port…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Item title="All devices" value="all" />
          <List.Dropdown.Item title="Online" value="online" />
          <List.Dropdown.Item title="Offline" value="offline" />
          <List.Dropdown.Item title="New (24 h)" value="new" />
          <List.Dropdown.Item title="With open ports" value="ports" />
        </List.Dropdown>
      }
      actions={<ActionPanel>{globalActions}</ActionPanel>}
    >
      {!running && scan?.error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Scan failed"
          description={`${scan.error}\nPress ⌘R to try again.`}
          actions={<ActionPanel>{globalActions}</ActionPanel>}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Wifi}
          title={running ? "Scanning the network…" : "No devices yet"}
          description={running ? status : "Press ⌘R to scan"}
          actions={<ActionPanel>{globalActions}</ActionPanel>}
        />
      )}
      <List.Section title={`Online (${online.length})`} subtitle={status}>
        {online.map(item)}
      </List.Section>
      <List.Section title={`Offline (${offline.length})`}>{offline.map(item)}</List.Section>
    </List>
  );
}

function DeviceDetail({ d, name }: { d: Device; name: string }) {
  const ports = d.ports ?? [];
  const md = [
    `### ${safe(name)}`,
    ports.length
      ? ports
          .map((p) => {
            const info = [p.product, p.extra, p.title].map(safe).filter(Boolean).join(" · ");
            return `- \`${p.port}/${p.proto}\` **${safe(p.service) || "unknown"}**${info ? ` — ${info}` : ""}`;
          })
          .join("\n")
      : d.portsScannedAt
        ? "_No open TCP ports found._"
        : "_Ports not scanned yet._",
  ].join("\n\n");
  const M = List.Item.Detail.Metadata;
  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <M>
          <M.TagList title="Status">
            <M.TagList.Item
              text={d.online ? "online" : "offline"}
              color={d.online ? Color.Green : Color.SecondaryText}
            />
          </M.TagList>
          {d.firmware && (
            <M.Label title="Firmware" text={[d.firmware.kind, d.firmware.version].filter(Boolean).join(" ")} />
          )}
          {d.firmware?.name && <M.Label title="Device name" text={d.firmware.name} />}
          {d.firmware?.id && (
            <M.Label title={d.firmware.kind === "Tuya" ? "Device ID (app)" : "Device ID"} text={d.firmware.id} />
          )}
          {d.firmware?.model && (
            <M.Label title={d.firmware.kind === "Tuya" ? "Product key" : "Model"} text={d.firmware.model} />
          )}
          {Object.entries(d.firmware?.details ?? {})
            .filter(([k]) => k !== "productKey")
            .map(([k, v]) => (
              <M.Label key={k} title={labelOf(k)} text={String(v)} />
            ))}
          <M.Separator />
          <M.Label title="IP" text={d.ip} />
          <M.Label title="MAC" text={d.mac ?? "—"} />
          <M.Label title="Vendor" text={d.vendor ?? "unknown"} />
          {d.type && <M.Label title="Looks like" text={d.type} />}
          {d.mdnsName && <M.Label title="mDNS" text={d.mdnsName} />}
          {d.hostname && <M.Label title="DNS" text={d.hostname} />}
          {d.osHint && <M.Label title="OS hint" text={d.osHint} />}
          <M.Separator />
          <M.Label title="First seen" text={new Date(d.firstSeen).toLocaleString()} />
          <M.Label title="Last seen" text={`${new Date(d.lastSeen).toLocaleString()} (${ago(d.lastSeen)})`} />
          <M.Label title="Ports scanned" text={d.portsScannedAt ? ago(d.portsScannedAt) : "never"} />
        </M>
      }
    />
  );
}

function RenameForm({ d, current, onDone }: { d: Device; current: string; onDone: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Rename ${d.ip}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={(v: { name: string }) => {
              try {
                writeName(d, v.name);
              } catch (e) {
                showToast({ style: Toast.Style.Failure, title: "Could not save name", message: String(e) });
                return;
              }
              onDone();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={current}
        placeholder={d.mdnsName ?? d.vendor ?? ""}
        info="Empty = automatic name"
      />
    </Form>
  );
}
