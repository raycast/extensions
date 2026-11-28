import { requireApiKey } from "../api-key";
import { codeName, getCode, getScans, type ScanRange } from "../qrdx-api";

interface Input {
  /** The code's id, from list-dynamic-codes. */
  codeId: string;
  /** The period to count: 7d, 30d (the default), 90d, 365d or all. */
  range?: ScanRange;
}

/** The top rows of a breakdown as "a (3), b (2)". */
function top(rows: { value: string | null; count: number }[]): string {
  if (rows.length === 0) return "none";
  return rows
    .slice(0, 5)
    .map((row) => `${row.value?.trim() || "unknown"} (${row.count})`)
    .join(", ");
}

/**
 * Scan analytics of a dynamic QR code in the user's QRdx workspace: total and
 * unique scans in a period, and the top countries, cities, devices, operating
 * systems, browsers and referrers. Find the code's id with list-dynamic-codes.
 */
export default async function getScansTool(input: Input): Promise<string> {
  const key = requireApiKey();
  const [code, scans] = await Promise.all([getCode(key, input.codeId), getScans(key, input.codeId, input.range)]);
  const cities = scans.cities.map((row) => ({
    value: row.city ? `${row.city}${row.country ? `, ${row.country}` : ""}` : null,
    count: row.count,
  }));
  const retention =
    scans.retentionDays !== null && scans.range !== "all"
      ? `\nThe workspace's plan keeps ${scans.retentionDays} days of scan history.`
      : "";
  return (
    [
      `${codeName(code)} (${code.shortLink}): ${scans.total} scans from ${scans.unique} unique visitors since ${scans.from.slice(0, 10)} (range ${scans.range}); ${code.scanCount} scans in total.`,
      `Countries: ${top(scans.countries)}`,
      `Cities: ${top(cities)}`,
      `Devices: ${top(scans.devices)}`,
      `Operating systems: ${top(scans.os)}`,
      `Browsers: ${top(scans.browsers)}`,
      `Referrers: ${top(scans.referrers)}`,
    ].join("\n") + retention
  );
}
