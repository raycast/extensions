import { Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

interface ConditionResult {
  condition: string;
  success: boolean;
}

interface GatusResult {
  status: number;
  duration: number;
  success: boolean;
  timestamp: string;
  conditionResults?: ConditionResult[];
}

interface GatusEvent {
  type: "START" | "HEALTHY" | "UNHEALTHY";
  timestamp: string;
}

interface GatusEndpointDetail {
  name: string;
  key: string;
  group?: string;
  results: GatusResult[];
  events: GatusEvent[];
}

interface Props {
  endpointKey: string;
  endpointName: string;
  baseUrl: string;
  authToken?: string;
}

function extractBadgeValue(svg: string): string | null {
  const matches = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1].trim());
  if (!matches.length) return null;
  const unique = [...new Set(matches)];
  return unique[unique.length - 1];
}

function useBadgeValue(url: string, headers?: HeadersInit) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { headers })
      .then((res) => res.text())
      .then((svg) => {
        if (!cancelled) setValue(extractBadgeValue(svg));
      })
      .catch(() => {
        if (!cancelled) setValue(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return value;
}

export default function EndpointDetail({ endpointKey, endpointName, baseUrl, authToken }: Props) {
  const { data, isLoading } = useFetch<GatusEndpointDetail>(`${baseUrl}/api/v1/endpoints/${endpointKey}/statuses`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
  const badgeBase = `${baseUrl}/api/v1/endpoints/${endpointKey}`;

  const uptime24h = useBadgeValue(`${badgeBase}/uptimes/24h/badge.svg`, headers);
  const uptime7d = useBadgeValue(`${badgeBase}/uptimes/7d/badge.svg`, headers);
  const responseTime24h = useBadgeValue(`${badgeBase}/response-times/24h/badge.svg`, headers);

  const results = data?.results ?? [];
  const lastResult = results[results.length - 1];
  const lastEvent = data?.events[data.events.length - 1];

  const markdown = `
# ${endpointName}

${lastResult?.success ? "🟢 **UP**" : "🔴 **DOWN**"}

---

| | Metrics |
|---|---|
| **Uptime 24h** | ${uptime24h ?? "…"} |
| **Uptime 7d** | ${uptime7d ?? "…"} |
| **avg ResponseTime (24h)** | ${responseTime24h ?? "…"} |
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={endpointName} />
          {data?.group && <Detail.Metadata.Label title="Group" text={data.group} />}
          <Detail.Metadata.Separator />

          {lastEvent && (
            <Detail.Metadata.Label
              title="Last state change"
              text={`${lastEvent.type} — ${new Date(lastEvent.timestamp).toLocaleString()}`}
              icon={{
                source: lastEvent.type === "HEALTHY" ? Icon.CheckCircle : Icon.XMarkCircle,
                tintColor: lastEvent.type === "HEALTHY" ? Color.Green : Color.Red,
              }}
            />
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Conditions">
            {(lastResult?.conditionResults ?? []).map((c, i) => (
              <Detail.Metadata.TagList.Item key={i} text={c.condition} color={c.success ? Color.Green : Color.Red} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
