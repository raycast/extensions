import { Color, Icon, type Image } from "@raycast/api";
import type { ProbeLocation, DnsAnswer, HttpResult, MtrHop, MtrResult, TracerouteResult } from "../api/globalping";

// Probe labels

/**
 * Returns a flag image URL for a two-letter country code, with a globe fallback.
 */
export function getCountryFlagIcon(countryCode: string): Image.ImageLike {
  const normalizedCode = countryCode.trim().toLowerCase();

  if (!/^[a-z]{2}$/.test(normalizedCode)) {
    return Icon.Globe;
  }

  return {
    source: `https://cdn.jsdelivr.net/npm/country-flag-icons@1.6.15/3x2/${normalizedCode.toUpperCase()}.svg`,
    fallback: Icon.Globe,
  };
}

/**
 * Returns the flag icon used for a probe in lists and detail views.
 */
export function getProbeFlagIcon(probe: ProbeLocation): Image.ImageLike {
  return getCountryFlagIcon(probe.country);
}

/**
 * Formats a probe location as `City, CountryCode`.
 */
export function formatProbeLabel(probe: ProbeLocation): string {
  return `${probe.city}, ${probe.country}`;
}

/**
 * Returns the provider/network name shown alongside a probe.
 */
export function formatProbeSubtitle(probe: ProbeLocation): string {
  return probe.network;
}

/**
 * Returns the primary list title for a probe entry.
 */
export function formatProbeListTitle(probe: ProbeLocation): string {
  return probe.network;
}

// Latency icon

/**
 * Maps an average latency value to the matching Raycast signal icon and color.
 */
export function getLatencyIcon(avg: number): { source: Icon; tintColor: Color } {
  if (avg <= 50) {
    return { source: Icon.Signal3, tintColor: Color.Green };
  } else if (avg <= 150) {
    return { source: Icon.Signal2, tintColor: Color.Yellow };
  } else {
    return { source: Icon.Signal1, tintColor: Color.Red };
  }
}

// HTTP status color

/**
 * Maps HTTP status codes to a compact success/warning/error color.
 */
export function getHttpStatusColor(statusCode: number): Color {
  if (statusCode < 300) return Color.Green;
  if (statusCode < 400) return Color.Yellow;
  return Color.Red;
}

// DNS type color

/**
 * Assigns a stable tag color to each supported DNS record type.
 */
export function getDnsTypeColor(type: string): Color {
  switch (type?.toUpperCase()) {
    case "A":
      return Color.Blue;
    case "AAAA":
      return Color.Purple;
    case "CNAME":
      return Color.Orange;
    case "MX":
      return Color.Yellow;
    case "NS":
      return Color.Green;
    case "PTR":
      return Color.Magenta;
    case "TXT":
    case "SOA":
    default:
      return Color.SecondaryText;
  }
}

// Ping formatters

/**
 * Builds a markdown summary table for finished ping results across probes.
 */
export function formatResultsAsMarkdownTable(
  target: string,
  results: Array<{ probe: ProbeLocation; min?: number; max?: number; avg?: number; loss?: number }>,
): string {
  if (results.length === 0) return "";

  const header = `## Ping results: ${escapeMarkdownTableCell(target)}\n\n| Location | Network | Avg | Min | Max | Loss |\n|---|---|---|---|---|---|`;
  const rows = results
    .map((r) => {
      const location = escapeMarkdownTableCell(formatProbeLabel(r.probe));
      const network = escapeMarkdownTableCell(r.probe.network);
      const avg = r.avg != null ? `${r.avg} ms` : "—";
      const min = r.min != null ? `${r.min} ms` : "—";
      const max = r.max != null ? `${r.max} ms` : "—";
      const loss = r.loss != null ? `${r.loss}%` : "—";
      return `| ${location} | ${network} | ${avg} | ${min} | ${max} | ${loss} |`;
    })
    .join("\n");

  return `${header}\n${rows}`;
}

/**
 * Builds a markdown summary table for finished DNS results across probes.
 */
export function formatDnsResultsAsMarkdownTable(
  target: string,
  queryType: string,
  results: Array<{ probe: ProbeLocation; answers?: DnsAnswer[] }>,
): string {
  if (results.length === 0) return "";

  const header = `## DNS results: ${escapeMarkdownTableCell(target)} (${escapeMarkdownTableCell(queryType)})\n\n| Location | Network | Answers |\n|---|---|---|`;
  const rows = results
    .map((r) => {
      const location = escapeMarkdownTableCell(formatProbeLabel(r.probe));
      const network = escapeMarkdownTableCell(r.probe.network);
      const answers =
        r.answers && r.answers.length > 0 ? escapeMarkdownTableCell(r.answers.map((a) => a.value).join(", ")) : "—";
      return `| ${location} | ${network} | ${answers} |`;
    })
    .join("\n");

  return `${header}\n${rows}`;
}

// HTTP formatters

/**
 * Formats one HTTP result as markdown for the detail export/copy action.
 */
export function formatHttpResultAsMarkdown(target: string, label: string, result: HttpResult): string {
  if (result.status === "failed" || result.status === "offline") {
    const failureMessage = result.rawOutput?.trim() || "The probe could not complete the HTTP request.";
    return `## HTTP failed: \`${target}\` — ${label}\n\n\`\`\`\n${failureMessage}\n\`\`\``;
  }

  if (result.status === "in-progress") {
    return `## HTTP: \`${target}\` — ${label}\n\n*HTTP request in progress…*`;
  }

  return `## HTTP: \`${target}\` — ${label}\n\n\`\`\`\n${result.rawOutput ?? ""}\n\`\`\``;
}

/**
 * Builds a markdown summary table for finished HTTP probe results.
 */
export function formatHttpResultsAsMarkdownTable(
  target: string,
  results: Array<{ probe: ProbeLocation; statusCode?: number; timings?: HttpResult["timings"] }>,
): string {
  if (results.length === 0) return "";

  const header = `## HTTP results: ${escapeMarkdownTableCell(target)}\n\n| Location | Network | Status | Total | DNS | TLS | TCP | First Byte |\n|---|---|---|---|---|---|---|---|`;
  const rows = results
    .map((r) => {
      const location = escapeMarkdownTableCell(formatProbeLabel(r.probe));
      const network = escapeMarkdownTableCell(r.probe.network);
      const status = r.statusCode ?? "—";
      const total = r.timings?.total != null ? `${r.timings.total}ms` : "—";
      const dns = r.timings?.dns != null ? `${r.timings.dns}ms` : "—";
      const tls = r.timings?.tls != null ? `${r.timings.tls}ms` : "—";
      const tcp = r.timings?.tcp != null ? `${r.timings.tcp}ms` : "—";
      const firstByte = r.timings?.firstByte != null ? `${r.timings.firstByte}ms` : "—";
      return `| ${location} | ${network} | ${status} | ${total} | ${dns} | ${tls} | ${tcp} | ${firstByte} |`;
    })
    .join("\n");

  return `${header}\n${rows}`;
}

// Traceroute formatters

/**
 * Formats one traceroute result as markdown, including hop-by-hop timings.
 */
export function formatTracerouteResultAsMarkdown(target: string, label: string, result: TracerouteResult): string {
  const hops = result.hops ?? [];

  let content = `## Traceroute: \`${target}\` — ${escapeMarkdownTableCell(label)}\n\n`;

  if (result.status === "failed" || result.status === "offline") {
    const failureMessage = result.rawOutput?.trim() || "The probe could not complete the traceroute.";
    return `${content}\`\`\`\n${failureMessage}\n\`\`\``;
  }

  if (hops.length === 0) {
    return result.status === "in-progress"
      ? `${content}*Hop discovery in progress…*`
      : `${content}*No hop data available*`;
  }

  content += "| Host / IP | RTT |\n|---|---|\n";
  content += hops
    .map((hop) => {
      const host = hop.resolvedHostname || hop.resolvedAddress || "—";
      const ip = hop.resolvedAddress && hop.resolvedAddress !== host ? ` (${hop.resolvedAddress})` : "";
      const timings = hop.timings?.map((timing) => `${timing.rtt} ms`).join(" / ") || "—";
      return `| ${escapeMarkdownTableCell(`${host}${ip}`)} | ${escapeMarkdownTableCell(timings)} |`;
    })
    .join("\n");

  return content;
}

export interface ParsedMtrRawRow {
  host: string;
  loss: string;
  drop: string;
  rcv: string;
  avg: string;
  stDev: string;
  jAvg: string;
}

/**
 * Parses CLI-style MTR raw output rows into structured cells used by UI and exports.
 */
export function parseMtrRawOutputRows(rawOutput?: string): ParsedMtrRawRow[] {
  if (!rawOutput) {
    return [];
  }

  return rawOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(\d+)\.\s+(.*?)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)$/);

      if (!match || !match[3].includes("%")) {
        return undefined;
      }

      return {
        host: match[2].trim(),
        loss: match[3],
        drop: match[4],
        rcv: match[5],
        avg: match[6],
        stDev: match[7],
        jAvg: match[8],
      };
    })
    .filter((row): row is ParsedMtrRawRow => row !== undefined);
}

/**
 * Escapes markdown table separators in cell values.
 */
function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

/**
 * Returns a host fallback for MTR rows when the raw output does not contain a parsed host column.
 */
export function getMtrFallbackHost(hop?: MtrHop): string {
  const asn = hop?.asn?.[0];

  if (!asn) {
    return "AS???";
  }

  return `AS${asn}`;
}

/**
 * Formats optional numeric MTR values for markdown output.
 */
function formatMtrValue(value: number | undefined): string {
  return value != null ? String(value) : "—";
}

/**
 * Formats one MTR result as a markdown table suitable for copy/export actions.
 */
export function formatMtrResultAsMarkdown(target: string, label: string, result: MtrResult): string {
  const hops = result.hops ?? [];

  let content = `## MTR: \`${target}\` — ${label}\n\n`;

  if (result.status === "failed" || result.status === "offline") {
    const failureMessage = result.rawOutput?.trim() || "The probe could not complete the MTR request.";
    return `${content}\`\`\`\n${failureMessage}\n\`\`\``;
  }

  if (hops.length === 0) {
    return result.status === "in-progress"
      ? `${content}*Hop discovery in progress…*`
      : `${content}*No hop data available*`;
  }

  const rawRows = parseMtrRawOutputRows(result.rawOutput);
  const rowCount = Math.max(hops.length, rawRows.length);

  content += "| Host | Loss% | Drop | Rcv | Avg | StDev | Javg |\n|---|---|---|---|---|---|---|\n";
  content += Array.from({ length: rowCount }, (_, index) => {
    const hop = hops[index];
    const rawRow = rawRows[index];
    const host = escapeMarkdownTableCell(rawRow?.host ?? getMtrFallbackHost(hop));
    const loss = rawRow?.loss ?? (hop?.stats?.loss != null ? `${hop.stats.loss}%` : "—");
    const drop = rawRow?.drop ?? formatMtrValue(hop?.stats?.drop);
    const rcv = rawRow?.rcv ?? formatMtrValue(hop?.stats?.rcv);
    const avg = rawRow?.avg ?? formatMtrValue(hop?.stats?.avg);
    const stDev = rawRow?.stDev ?? formatMtrValue(hop?.stats?.stDev);
    const jAvg = rawRow?.jAvg ?? formatMtrValue(hop?.stats?.jAvg);

    return `| ${host} | ${loss} | ${drop} | ${rcv} | ${avg} | ${stDev} | ${jAvg} |`;
  }).join("\n");

  return content;
}
