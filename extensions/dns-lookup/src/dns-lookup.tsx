import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  LaunchProps,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";

// --- UTILS ---
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

interface DohResponse {
  Answer?: { data: string; type: number }[];
  Authority?: { data: string; type: number }[];
}

interface GlobalpingAnswer {
  value?: string;
  target?: string;
  port?: number;
  priority?: number;
  weight?: number;
  exchange?: string;
  preference?: number;
}

interface GlobalpingPostResponse {
  id: string;
}
interface GlobalpingGetResponse {
  results: {
    probe: { city: string; country: string; network: string };
    result: { answers?: GlobalpingAnswer[]; status: string };
  }[];
}

interface DnsResult {
  id: string;
  provider: string;
  serverInfo: string;
  flag: string;
  result: string;
  status: "success" | "error" | "loading" | "warning";
  type: "fast" | "global";
}

// Props for DnsListItem component
interface DnsListItemProps {
  item: DnsResult;
  onRefresh: () => void;
  onSwitchToGlobal?: () => void;
  onSwitchToFast?: () => void;
}

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "SRV"];

export default function Command(props: LaunchProps<{ arguments: { domain?: string } }>) {
  const [domain, setDomain] = useState<string>(props.arguments.domain || "");
  const [recordType, setRecordType] = useState<string>("A");

  // UX States
  const [viewMode, setViewMode] = useState<"fast" | "global">("fast");
  const [results, setResults] = useState<DnsResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const formatSOA = (rawData: string) => {
    const parts = rawData.split(" ");
    if (parts.length < 7) return rawData;
    return `Serial: ${parts[2]} | TTL: ${parts[6]}`;
  };

  // --- FAST CHECK ---
  const runFastCheck = async (targetDomain: string, rType: string) => {
    if (!targetDomain || !targetDomain.includes(".")) return;

    setViewMode("fast");
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    const providers = [
      { id: "google", name: "Google", displayIp: "8.8.8.8", url: "https://dns.google/resolve", flag: "🇺🇸" },
      {
        id: "cloudflare",
        name: "Cloudflare",
        displayIp: "1.1.1.1",
        url: "https://cloudflare-dns.com/dns-query",
        flag: "☁️",
      },
      { id: "dnssb", name: "DNS.SB", displayIp: "185.222.222.222", url: "https://doh.dns.sb/dns-query", flag: "🇩🇪" },
      { id: "alidns", name: "Alibaba", displayIp: "223.5.5.5", url: "https://dns.alidns.com/resolve", flag: "🇨🇳" },
    ];

    const fastPlaceholders: DnsResult[] = providers.map((p) => ({
      id: p.id,
      provider: p.name,
      serverInfo: p.displayIp,
      flag: p.flag,
      result: "...",
      status: "loading",
      type: "fast",
    }));
    setResults(fastPlaceholders);

    const fetchPromises = providers.map(async (p) => {
      try {
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${p.url}?name=${targetDomain}&type=${rType}`, {
          headers: { Accept: "application/dns-json" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("Service unavailable");
        }

        const data = (await response.json()) as DohResponse;

        let output = "No records found";
        const status = "success";

        let records = data.Answer;
        if ((!records || records.length === 0) && (rType === "SOA" || rType === "NS")) {
          records = data.Authority;
        }

        if (records && Array.isArray(records) && records.length > 0) {
          output = records.map((a) => (rType === "SOA" ? formatSOA(a.data) : a.data)).join(", ");
        }

        setResults((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, result: output, status: status } : item)),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        setResults((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, result: "Unavailable", status: "error" } : item)),
        );
      }
    });

    await Promise.allSettled(fetchPromises);
    setIsLoading(false);
  };

  // --- GLOBAL CHECK ---
  const runGlobalCheck = async (isRefresh = false) => {
    if (!domain || !domain.includes(".")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Domain",
        message: "Please enter a valid domain name",
      });
      return;
    }

    setViewMode("global");
    setIsLoading(true);

    const preferences = getPreferenceValues<Preferences>();
    const hasToken = !!preferences.globalpingToken;

    if (isRefresh && results.length > 0) {
      // Refresh mode: keep the items but show they are loading
      setResults((prev) => prev.map((r) => ({ ...r, status: "loading", result: "Refreshing..." })));
    } else {
      // New search mode: clear everything
      // This will trigger the display of the EmptyView "Loading" while keeping the progress bar
      setResults([]);
    }

    try {
      const payload = {
        type: "dns",
        target: domain,
        limit: 8,
        locations: [
          { country: "US" },
          { country: "GB" },
          { country: "FR" },
          { country: "DE" },
          { country: "JP" },
          { country: "IN" },
          { country: "BR" },
          { country: "AU" },
        ],
        measurementOptions: { query: { type: recordType } },
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hasToken) headers["Authorization"] = `Bearer ${preferences.globalpingToken}`;

      const postRes = await fetch("https://api.globalping.io/v1/measurements", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (!postRes.ok) {
        if (postRes.status === 429) {
          if (hasToken) {
            await showFailureToast("Globalping Rate Limit Exceeded", {
              message: "Please consider to try again later or get more credits on globalping.io.",
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
              message: "Please consider to try again later or adding a free Globalping API key for higher limits.",
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

        if (postRes.status === 401) {
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

        throw new Error("Unable to connect to Globalping");
      }

      const postData = (await postRes.json()) as GlobalpingPostResponse;

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const getRes = await fetch(`https://api.globalping.io/v1/measurements/${postData.id}`);
      if (!getRes.ok) {
        throw new Error("Unable to retrieve results");
      }

      const data = (await getRes.json()) as GlobalpingGetResponse;

      const globalResults: DnsResult[] = data.results.map((r) => {
        let finalResult = "No records found";
        let finalStatus: "success" | "error" | "warning" = "success";

        if (r.result.status === "finished" && r.result.answers && r.result.answers.length > 0) {
          finalResult = r.result.answers
            .map((a) => {
              if (a.value) return a.value;
              if (a.target) return `${a.priority || 0} ${a.weight || 0} ${a.port || 0} ${a.target}`;
              if (a.exchange) return `${a.preference || 0} ${a.exchange}`;
              return JSON.stringify(a);
            })
            .join(", ");
        } else if (r.result.status === "finished") {
          finalResult = "No records found";
          finalStatus = "success";
        } else if (r.result.status === "failed") {
          finalResult = "Probe Error";
          finalStatus = "error";
        }

        return {
          id: `global-${r.probe.country}-${r.probe.city}-${r.probe.network}`,
          provider: `${r.probe.city}`,
          serverInfo: r.probe.network || r.probe.country,
          flag: getFlagEmoji(r.probe.country),
          result: finalResult,
          status: finalStatus,
          type: "global",
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
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";

      await showToast({
        style: Toast.Style.Failure,
        title: "Global Check Failed",
        message: errorMessage,
      });

      if (isRefresh) {
        setResults((prev) => prev.map((r) => ({ ...r, status: "error", result: "Update failed" })));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (props.arguments.domain) {
      runFastCheck(props.arguments.domain, "A");
    }
  }, []);

  // --- RENDER ---

  return (
    <List
      searchText={domain}
      onSearchTextChange={(text) => setDomain(text)}
      isLoading={isLoading}
      searchBarPlaceholder="Enter domain (e.g., google.com)"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Record Type"
          value={recordType}
          onChange={(newValue) => {
            setRecordType(newValue);
            if (domain.includes(".")) {
              if (viewMode === "fast") runFastCheck(domain, newValue);
              else runGlobalCheck(false);
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
        <List.Section
          title={viewMode === "fast" ? "🚀 Fast Check (Instant)" : "🌍 Global Check (Worldwide Propagation)"}
        >
          {results.map((item) => (
            <DnsListItem
              key={item.id}
              item={item}
              onRefresh={() => (viewMode === "fast" ? runFastCheck(domain, recordType) : runGlobalCheck(true))}
              onSwitchToGlobal={viewMode === "fast" ? () => runGlobalCheck(false) : undefined}
              onSwitchToFast={viewMode === "global" ? () => runFastCheck(domain, recordType) : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// --- ITEMS & DRILLDOWN ---

function DnsListItem({ item, onRefresh, onSwitchToGlobal, onSwitchToFast }: DnsListItemProps) {
  const hasMultipleResults = item.result.includes(", ");

  return (
    <List.Item
      icon={item.flag}
      title={item.provider}
      subtitle={item.serverInfo}
      accessories={[
        {
          text: {
            value: item.result,
            color: item.status === "error" ? Color.Red : item.status === "warning" ? Color.Orange : Color.PrimaryText,
          },
          tooltip: item.result.split(", ").join("\n"),
        },
        {
          icon:
            item.status === "success"
              ? { source: Icon.Check, tintColor: Color.Green }
              : item.status === "loading"
                ? { source: Icon.Circle, tintColor: Color.Yellow }
                : item.status === "warning"
                  ? { source: Icon.MinusCircle, tintColor: Color.Orange }
                  : { source: Icon.Xmark, tintColor: Color.Red },
        },
      ]}
      actions={
        <ActionPanel>
          {hasMultipleResults && item.status === "success" ? (
            <Action.Push title="View Details" icon={Icon.List} target={<DrillDownView item={item} />} />
          ) : (
            <Action.CopyToClipboard content={item.result} title="Copy Result" />
          )}
          {onSwitchToGlobal && (
            <Action
              title="Run Global Check"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={onSwitchToGlobal}
            />
          )}
          {onSwitchToFast && (
            <Action
              title="Return to Fast Check"
              icon={Icon.Bolt}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={onSwitchToFast}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
          {hasMultipleResults && <Action.CopyToClipboard title="Copy All Results" content={item.result} />}
        </ActionPanel>
      }
    />
  );
}

function DrillDownView({ item }: { item: DnsResult }) {
  const records = item.result.split(", ");
  return (
    <List navigationTitle={`${item.provider} - Details`}>
      <List.Section title={`Results via ${item.serverInfo}`}>
        {records.map((record: string, index: number) => (
          <List.Item
            key={index}
            title={record}
            icon={{ source: Icon.Dot, tintColor: Color.Blue }}
            accessories={[{ tooltip: record }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={record} />
                <Action.CopyToClipboard title="Copy All" content={item.result} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
