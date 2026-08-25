import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  openExtensionPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import {
  CheckResult,
  Preferences,
  categoryNames,
  checkUrl,
  parseCheckResponse,
  reportUrl,
  requestHeaders,
  webUrl,
} from "./lib/abuseipdb";
import { rememberLookup } from "./lib/recents";
import { scoreBar, verdictFor } from "./lib/verdict";

const MAX_SHOWN_REPORTS = 5;

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Never";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.toLocaleString()} (${relativeTime(date)})`;
}

function relativeTime(date: Date): string {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }
  return formatter.format(seconds, "second");
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/([\\`*_[\]<>#|$~])/g, "\\$1")
    .trim();
}

export function buildMarkdown(result: CheckResult, windowInDays: string): string {
  const verdict = verdictFor(result.abuseConfidenceScore);
  const lines = [
    `# ${result.ipAddress}`,
    "",
    `## ${verdict.label} — ${result.abuseConfidenceScore}% confidence of abuse`,
    "",
    `\`${scoreBar(result.abuseConfidenceScore)}\``,
    "",
    `${result.totalReports} report${result.totalReports === 1 ? "" : "s"} from ${result.numDistinctUsers} distinct ` +
      `reporter${result.numDistinctUsers === 1 ? "" : "s"} in the last ${windowInDays} days.`,
  ];

  const reports = result.reports ?? [];
  if (reports.length > 0) {
    lines.push("", "---", "", `### Latest Reports`, "");
    for (const report of reports.slice(0, MAX_SHOWN_REPORTS)) {
      const categories = categoryNames(report.categories).join(", ");
      const origin = report.reporterCountryName ? ` · reported from ${report.reporterCountryName}` : "";
      lines.push(`**${new Date(report.reportedAt).toLocaleString()}** · ${categories || "Uncategorised"}${origin}`);
      lines.push("");
      lines.push(report.comment ? `> ${escapeMarkdown(report.comment)}` : "> _No comment supplied._");
      lines.push("");
    }
    if (reports.length > MAX_SHOWN_REPORTS) {
      lines.push(`_${reports.length - MAX_SHOWN_REPORTS} more report(s) on abuseipdb.com._`);
    }
  }

  return lines.join("\n");
}

function ErrorView({ ip, message, onRetry }: { ip: string; message: string; onRetry: () => void }) {
  return (
    <Detail
      navigationTitle={ip}
      markdown={`# Lookup failed\n\n${escapeMarkdown(message)}`}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.OpenInBrowser title="Open on Abuseipdb.com" url={webUrl(ip)} />
        </ActionPanel>
      }
    />
  );
}

export function IpReport({ ip }: { ip: string }) {
  const { maxAgeInDays } = getPreferenceValues<Preferences>();
  const windowInDays = maxAgeInDays && maxAgeInDays.length > 0 ? maxAgeInDays : "90";

  const { isLoading, data, error, revalidate } = useFetch<CheckResult>(checkUrl(ip), {
    headers: requestHeaders(),
    parseResponse: parseCheckResponse,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (data) {
      rememberLookup({ ip: data.ipAddress, score: data.abuseConfidenceScore, checkedAt: new Date().toISOString() });
    }
  }, [data]);

  if (error) {
    return <ErrorView ip={ip} message={error.message} onRetry={revalidate} />;
  }

  const verdict = data ? verdictFor(data.abuseConfidenceScore) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={ip}
      markdown={data ? buildMarkdown(data, windowInDays) : `# ${ip}\n\nChecking AbuseIPDB…`}
      metadata={
        data && verdict ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Verdict">
              <Detail.Metadata.TagList.Item
                text={`${data.abuseConfidenceScore}% · ${verdict.label}`}
                color={verdict.color}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Reports" text={`${data.totalReports} from ${data.numDistinctUsers} users`} />
            <Detail.Metadata.Label title="Last Reported" text={formatDate(data.lastReportedAt)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Country" text={data.countryName ?? data.countryCode ?? "Unknown"} />
            <Detail.Metadata.Label title="ISP" text={data.isp ?? "Unknown"} />
            <Detail.Metadata.Label title="Usage Type" text={data.usageType ?? "Unknown"} />
            <Detail.Metadata.Label title="Domain" text={data.domain ?? "Unknown"} />
            <Detail.Metadata.Label
              title="Hostnames"
              text={data.hostnames.length > 0 ? data.hostnames.join(", ") : "None"}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Flags">
              <Detail.Metadata.TagList.Item text={`IPv${data.ipVersion}`} color={Color.SecondaryText} />
              <Detail.Metadata.TagList.Item
                text={data.isPublic ? "Public" : "Private"}
                color={data.isPublic ? Color.SecondaryText : Color.Blue}
              />
              {data.isTor ? <Detail.Metadata.TagList.Item text="Tor Exit Node" color={Color.Purple} /> : null}
              {data.isWhitelisted ? <Detail.Metadata.TagList.Item text="Whitelisted" color={Color.Green} /> : null}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Link title="AbuseIPDB" target={webUrl(ip)} text={`Open ${ip}`} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Abuseipdb.com" url={webUrl(ip)} />
          <Action.CopyToClipboard title="Copy IP Address" content={ip} shortcut={Keyboard.Shortcut.Common.Copy} />
          {data ? (
            <>
              <Action.CopyToClipboard
                title="Copy Report as Markdown"
                content={buildMarkdown(data, windowInDays)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              />
              <Action.CopyToClipboard
                title="Copy Raw JSON"
                content={JSON.stringify(data, null, 2)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
              />
            </>
          ) : null}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.OpenInBrowser title="Report This IP" icon={Icon.ExclamationMark} url={reportUrl(ip)} />
        </ActionPanel>
      }
    />
  );
}
