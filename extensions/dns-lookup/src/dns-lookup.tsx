import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Image,
  Keyboard,
  showToast,
  Toast,
  LaunchProps,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { getFavicon, showFailureToast, useCachedState } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { Globalping, type MeasurementLocationOption } from "globalping";
import { RECORD_TYPES, RecordType, Via, formatRecord, getFastResolvers, normalizeDomain, sortRecords } from "./dns";

// --- UTILS ---
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// --- TYPES ---
type Status = "success" | "error" | "loading" | "warning";

interface DnsResult {
  id: string;
  provider: string;
  icon: Image.ImageLike;
  // Resolver or probe details, shown in the tooltip and the detail panel
  info: { title: string; text: string }[];
  records: string[];
  // Shown when there are no records
  message: string;
  status: Status;
  via?: Via;
}

// Props for DnsListItem component
interface DnsListItemProps {
  item: DnsResult;
  recordType: RecordType;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
  onSwitchToGlobal?: () => void;
  onSwitchToFast?: () => void;
}

// --- CONSTANTS ---
const VIA_LABELS: Record<Via, string> = {
  DoH: "DNS over HTTPS (encrypted)",
  UDP: "Classic DNS, UDP 53 (unencrypted)",
};

const VIA_TOOLTIPS: Record<Via, string> = {
  DoH: "Answered over DNS over HTTPS",
  UDP: "Answered over classic DNS (UDP port 53). A network that intercepts port 53 may answer instead of this resolver.",
};

const VIA_ICONS: Record<Via, Image.ImageLike> = {
  DoH: { source: Icon.Lock, tintColor: Color.SecondaryText },
  UDP: { source: Icon.LockUnlocked, tintColor: Color.SecondaryText },
};

const STATUS_COLORS: Record<Status, Color> = {
  success: Color.Green,
  loading: Color.Yellow,
  warning: Color.Orange,
  error: Color.Red,
};

const STATUS_ICONS: Record<Status, Image.ImageLike> = {
  success: { source: Icon.Check, tintColor: STATUS_COLORS.success },
  loading: { source: Icon.Circle, tintColor: STATUS_COLORS.loading },
  warning: { source: Icon.MinusCircle, tintColor: STATUS_COLORS.warning },
  error: { source: Icon.Xmark, tintColor: STATUS_COLORS.error },
};

const getStatusText = ({ status, records, message }: DnsResult) =>
  status === "success" && records.length > 0 ? "Resolved" : message;

// Markdown code span whose delimiter is longer than any backtick run in the value (CommonMark)
const toInlineCode = (value: string) => {
  const fence = "`".repeat(Math.max(0, ...Array.from(value.matchAll(/`+/g), ([run]) => run.length)) + 1);
  const padding = value.startsWith("`") || value.endsWith("`") ? " " : "";
  return `${fence}${padding}${value}${padding}${fence}`;
};

const SWITCH_MODE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "enter" },
  Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
};

const TOGGLE_DETAIL_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};

const GLOBALPING_USER_AGENT = "dns-lookup-raycast (https://www.raycast.com/valentin_denis/dns-lookup)";

const GLOBAL_LOCATIONS: MeasurementLocationOption[] = ["US", "GB", "FR", "DE", "JP", "IN", "BR", "AU"].map(
  (country) => ({ country }),
);

// Tells whether every row returned the same answer, once they are all settled
const getConcordance = (items: DnsResult[], recordType: RecordType) => {
  if (items.length === 0 || items.some((item) => item.status === "loading")) return undefined;

  // DNS names are case-insensitive, TXT values are not
  const toKey = ({ status, records, message }: DnsResult) => {
    const values = recordType === "TXT" ? records : sortRecords(records.map((r) => r.toLowerCase()));
    return `${status}|${values.join("\n") || message}`;
  };

  // Failed rows are not a different answer, they only lower the ratio
  const answered = items.filter((item) => item.status !== "error");
  const answers = new Set(answered.map(toKey));
  if (answers.size === 0) return undefined;
  if (answers.size > 1) return "Answers differ";
  return answered.length === items.length ? "All identical" : `${answered.length}/${items.length} identical`;
};

export default function Command(props: LaunchProps<{ arguments: Arguments.DnsLookup }>) {
  const [domain, setDomain] = useState<string>(props.arguments.domain || "");
  const [recordType, setRecordType] = useState<RecordType>("A");

  // UX States
  const [viewMode, setViewMode] = useState<"fast" | "global">("fast");
  const [results, setResults] = useState<DnsResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>("is-showing-detail", false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  // Cancels the running check so its late answers never overwrite the new one
  const startRequest = () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  };

  // --- FAST CHECK ---
  const runFastCheck = async (input: string, rType: RecordType) => {
    const targetDomain = normalizeDomain(input);
    if (!targetDomain) return;

    setViewMode("fast");
    const { signal } = startRequest();
    setIsLoading(true);

    const resolvers = getFastResolvers(preferences.fastCheckTransport);
    setResults(
      resolvers.map((r) => ({
        id: r.id,
        provider: r.name,
        icon: r.website ? getFavicon(r.website, { fallback: Icon.Globe }) : Icon.Network,
        info: [{ title: r.id === "system" ? "Servers" : "Server", text: r.serverInfo }],
        records: [],
        message: "Resolving...",
        status: "loading",
      })),
    );

    const updateResult = (id: string, update: Partial<DnsResult>) =>
      setResults((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));

    await Promise.allSettled(
      resolvers.map(async (r) => {
        try {
          const { status, records, message, via } = await r.lookup(targetDomain, rType, signal);
          if (signal.aborted) return;
          updateResult(r.id, { status, records: sortRecords(records), message: message ?? "No records found", via });
        } catch {
          if (signal.aborted) return;
          updateResult(r.id, { status: "error", message: "Unavailable" });
        }
      }),
    );

    if (!signal.aborted) setIsLoading(false);
  };

  // --- GLOBAL CHECK ---
  const runGlobalCheck = async (rType: RecordType, isRefresh = false) => {
    const targetDomain = normalizeDomain(domain);
    if (!targetDomain) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Domain",
        message: "Please enter a valid domain name",
      });
      return;
    }

    setViewMode("global");
    const { signal } = startRequest();
    setIsLoading(true);

    const hasToken = !!preferences.globalpingToken;

    if (isRefresh && results.length > 0) {
      // Refresh mode: keep the items but show they are loading
      setResults((prev) => prev.map((r) => ({ ...r, status: "loading", message: "Refreshing..." })));
    } else {
      // New search mode: clear everything
      // This will trigger the display of the EmptyView "Loading" while keeping the progress bar
      setResults([]);
    }

    try {
      const globalping = new Globalping({
        auth: preferences.globalpingToken || undefined,
        userAgent: GLOBALPING_USER_AGENT,
      });

      const created = await globalping.createMeasurement({
        type: "dns",
        target: targetDomain,
        limit: 8,
        locations: GLOBAL_LOCATIONS,
        measurementOptions: { query: { type: rType } },
      });
      // createMeasurement does not accept a signal
      if (signal.aborted) return;

      if (!created.ok) {
        if (Globalping.isHttpStatus(429, created)) {
          if (hasToken) {
            await showFailureToast("Globalping Rate Limit Exceeded", {
              message: "Try again later or get more credits on globalping.io.",
              primaryAction: {
                title: "Get More Credits",
                onAction: async (toast) => {
                  await toast.hide();
                  await open("https://globalping.io/credits");
                },
              },
            });
          } else {
            await showFailureToast("Globalping Rate Limit Exceeded", {
              message: "Try again later or add a free Globalping API key for higher limits.",
              primaryAction: {
                title: "Open Preferences",
                onAction: async (toast) => {
                  await toast.hide();
                  await openExtensionPreferences();
                },
              },
            });
          }
          return;
        }

        if (created.response.status === 401) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid API Key",
            message: "Please check your API key in preferences",
            primaryAction: {
              title: "Open Preferences",
              onAction: async (toast) => {
                await toast.hide();
                await openExtensionPreferences();
              },
            },
          });
          return;
        }

        throw new Error(created.data.error.message);
      }

      const measurement = await globalping.awaitMeasurement(created.data.id, { signal });
      if (!measurement.ok) {
        throw new Error(measurement.data.error.message);
      }
      Globalping.assertMeasurementType("dns", measurement.data);

      const globalResults: DnsResult[] = measurement.data.results.map((r, index) => {
        const info = [
          { title: "Location", text: `${r.probe.city}, ${r.probe.country}` },
          { title: "Network", text: `${r.probe.network} (AS${r.probe.asn})` },
        ];
        let records: string[] = [];
        let status: Status = "error";
        let message = r.result.status === "offline" ? "Probe offline" : "Probe error";

        if (r.result.status === "finished" && "answers" in r.result) {
          info.push({ title: "Resolver", text: r.result.resolver });
          records = r.result.answers.filter((a) => a.type === rType).map((a) => formatRecord(rType, a.value));
          if (r.result.statusCodeName === "NOERROR") {
            status = "success";
            message = "No records found";
          } else if (r.result.statusCodeName === "NXDOMAIN") {
            status = "warning";
            message = "Not found (NXDOMAIN)";
          } else {
            message = r.result.statusCodeName;
          }
        }

        return {
          id: `global-${index}-${r.probe.country}-${r.probe.city}`,
          provider: r.probe.city,
          icon: getFlagEmoji(r.probe.country),
          info,
          records: sortRecords(records),
          message,
          status,
        };
      });

      if (globalResults.length === 0) {
        throw new Error("No probes available");
      }

      setResults(globalResults);

      if (!isRefresh) {
        await showToast({
          style: Toast.Style.Success,
          title: "Global Check Complete",
        });
      }
    } catch (err) {
      if (signal.aborted) return;
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";

      await showToast({
        style: Toast.Style.Failure,
        title: "Global Check Failed",
        message: errorMessage,
      });

      if (isRefresh) {
        setResults((prev) => prev.map((r) => ({ ...r, status: "error", records: [], message: "Update failed" })));
      }
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (props.arguments.domain) {
      runFastCheck(props.arguments.domain, "A");
    }
    return () => abortControllerRef.current?.abort();
  }, []);

  // --- RENDER ---

  // The detail panel leaves no room for a section subtitle
  const concordance = isShowingDetail ? undefined : getConcordance(results, recordType);

  return (
    <List
      searchText={domain}
      onSearchTextChange={(text) => setDomain(text)}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && results.length > 0}
      searchBarPlaceholder="Enter domain (e.g., google.com)"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Record Type"
          value={recordType}
          onChange={(newValue) => {
            const rType = newValue as RecordType;
            setRecordType(rType);
            if (normalizeDomain(domain)) {
              if (viewMode === "fast") runFastCheck(domain, rType);
              else runGlobalCheck(rType);
            }
          }}
        >
          {RECORD_TYPES.map((t) => (
            <List.Dropdown.Item key={t} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      {results.length === 0 ? (
        <List.EmptyView
          icon={
            isLoading
              ? { source: Icon.CircleProgress50, tintColor: Color.Blue }
              : { source: Icon.Globe, tintColor: Color.Blue }
          }
          title={isLoading ? "Loading..." : "DNS Lookup"}
          description={isLoading ? "Querying global probes..." : "Enter a domain to start the lookup."}
          actions={
            !isLoading ? (
              <ActionPanel>
                <Action title="Run Fast Check" onAction={() => runFastCheck(domain, recordType)} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        <List.Section title={viewMode === "fast" ? "Fast Check" : "Global Check"} subtitle={concordance}>
          {results.map((item) => (
            <DnsListItem
              key={item.id}
              item={item}
              recordType={recordType}
              isShowingDetail={isShowingDetail}
              onToggleDetail={() => setIsShowingDetail((value) => !value)}
              onRefresh={() =>
                viewMode === "fast" ? runFastCheck(domain, recordType) : runGlobalCheck(recordType, true)
              }
              onSwitchToGlobal={viewMode === "fast" ? () => runGlobalCheck(recordType) : undefined}
              onSwitchToFast={viewMode === "global" ? () => runFastCheck(domain, recordType) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// --- ITEMS & DETAIL ---

function DnsListItem({
  item,
  recordType,
  isShowingDetail,
  onToggleDetail,
  onRefresh,
  onSwitchToGlobal,
  onSwitchToFast,
}: DnsListItemProps) {
  const { records, status, via } = item;
  const isSettledWithoutRecords = records.length === 0 && status !== "loading";
  const statusAccessory: List.Item.Accessory = { icon: STATUS_ICONS[status], tooltip: getStatusText(item) };

  // Fixed-width accessories so the status icon always stays visible
  const accessories: List.Item.Accessory[] = [];
  if (records.length > 1) accessories.push({ tag: `+${records.length - 1}`, tooltip: records.join("\n") });
  if (isSettledWithoutRecords && status !== "success") {
    accessories.push({ text: { value: item.message, color: STATUS_COLORS[status] } });
  }
  if (via) accessories.push({ icon: VIA_ICONS[via], tooltip: VIA_TOOLTIPS[via] });
  accessories.push(statusAccessory);

  const subtitle = records.length > 0 ? records[0] : status === "success" || status === "loading" ? item.message : "";

  return (
    <List.Item
      icon={item.icon}
      title={{ value: item.provider, tooltip: item.info.map((i) => `${i.title}: ${i.text}`).join("\n") }}
      subtitle={isShowingDetail ? undefined : { value: subtitle, tooltip: records.join("\n") || item.message }}
      accessories={isShowingDetail ? [statusAccessory] : accessories}
      detail={<ResultDetail item={item} recordType={recordType} />}
      actions={
        <ActionPanel>
          {records.length > 0 && (
            <Action.CopyToClipboard
              title={records.length > 1 ? "Copy All Records" : "Copy Record"}
              content={records.join("\n")}
            />
          )}
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={TOGGLE_DETAIL_SHORTCUT}
            onAction={onToggleDetail}
          />
          {records.length > 1 && (
            <ActionPanel.Submenu title="Copy Record" icon={Icon.Clipboard}>
              {records.map((record, index) => (
                <Action.CopyToClipboard key={index} title={record} content={record} />
              ))}
            </ActionPanel.Submenu>
          )}
          {onSwitchToGlobal && (
            <Action
              title="Run Global Check"
              icon={Icon.Globe}
              shortcut={SWITCH_MODE_SHORTCUT}
              onAction={onSwitchToGlobal}
            />
          )}
          {onSwitchToFast && (
            <Action
              title="Return to Fast Check"
              icon={Icon.Bolt}
              shortcut={SWITCH_MODE_SHORTCUT}
              onAction={onSwitchToFast}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function ResultDetail({ item, recordType }: { item: DnsResult; recordType: RecordType }) {
  const { records, status, via } = item;
  const markdown =
    records.length > 0
      ? [
          `### ${records.length} ${recordType} record${records.length > 1 ? "s" : ""}`,
          "",
          ...records.map((r) => `- ${toInlineCode(r)}`),
        ].join("\n")
      : `### ${item.message}`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {item.info.map((i) => (
            <List.Item.Detail.Metadata.Label key={i.title} title={i.title} text={i.text} />
          ))}
          {via && <List.Item.Detail.Metadata.Label title="Transport" text={VIA_LABELS[via]} icon={VIA_ICONS[via]} />}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={{ value: getStatusText(item), color: STATUS_COLORS[status] }}
            icon={STATUS_ICONS[status]}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
