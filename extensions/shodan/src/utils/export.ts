import { Clipboard, showToast, Toast, showHUD } from "@raycast/api";
import { ShodanSearchMatch, ShodanHost } from "../api/types";

export function exportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function escapeCSVCell(cell: unknown): string {
  if (cell === null || cell === undefined) return "";

  const value = String(cell);

  // Escape double quotes by doubling them and remove newlines/carriage returns
  const escaped = value
    .replace(/"/g, '""')
    .replace(/\r?\n/g, " ")
    .replace(/\r/g, " ");

  // Always wrap in quotes to handle commas, quotes, and other special chars
  return `"${escaped}"`;
}

export function exportToCSV(results: ShodanSearchMatch[]): string {
  if (!results.length) return "";

  const headers = [
    "ip",
    "port",
    "product",
    "version",
    "org",
    "asn",
    "isp",
    "country",
    "city",
    "latitude",
    "longitude",
    "hostnames",
    "vulns",
    "timestamp",
  ];

  const rows = results.map((r) => [
    r.ip_str,
    r.port,
    r.product || "",
    r.version || "",
    r.org || "",
    r.asn || "",
    r.isp || "",
    r.location?.country_name || "",
    r.location?.city || "",
    r.location?.latitude ?? "",
    r.location?.longitude ?? "",
    r.hostnames?.join(";") || "",
    r.vulns ? Object.keys(r.vulns).join(";") : "",
    r.timestamp || "",
  ]);

  const csvContent = [
    headers.map(escapeCSVCell).join(","),
    ...rows.map((row) => row.map(escapeCSVCell).join(",")),
  ].join("\n");

  return csvContent;
}

export async function copyAsJSON(
  data: unknown,
  itemName = "data",
): Promise<void> {
  await Clipboard.copy(exportToJSON(data));
  await showToast({
    style: Toast.Style.Success,
    title: "Copied to Clipboard",
    message: `${itemName} copied as JSON`,
  });
}

export async function copyAsCSV(results: ShodanSearchMatch[]): Promise<void> {
  const csv = exportToCSV(results);
  await Clipboard.copy(csv);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied to Clipboard",
    message: `${results.length} results copied as CSV`,
  });
}

export async function copyHostAsJSON(
  host: ShodanHost | ShodanSearchMatch,
): Promise<void> {
  await copyAsJSON(host, `Host ${host.ip_str}`);
}

export async function copyToClipboardWithHUD(
  content: string,
  message: string,
): Promise<void> {
  await Clipboard.copy(content);
  await showHUD(message);
}
