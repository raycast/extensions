import { normalizeDomain, type DnsRecord, type RecordType } from "./dns.ts";

export type GlobalResult = {
  city: string;
  country: string;
  network: string;
  resolver: string;
  kind: "answer" | "no-record" | "nxdomain" | "error";
  records: DnsRecord[];
  detail?: string;
};

type Measurement = {
  status?: string;
  results?: Array<{
    probe?: { city?: string; country?: string; network?: string };
    result?: {
      status?: string;
      statusCode?: number;
      statusCodeName?: string;
      resolver?: string;
      answers?: Array<{ type?: string; ttl?: number; value?: string }>;
      rawOutput?: string;
    };
  }>;
};

const API = "https://api.globalping.io/v1/measurements";
const LOCATIONS = ["NA", "SA", "EU", "AF", "AS", "OC"].map((continent) => ({
  continent,
  limit: 3,
}));
const HEADERS = {
  "User-Agent": "dns-tools-raycast/1.0",
  Accept: "application/json",
};

function errorForStatus(status: number): Error {
  if (status === 429)
    return new Error(
      "Globalping's free hourly probe limit has been reached. Try again later.",
    );
  return new Error(`Globalping request failed (HTTP ${status}).`);
}

export function parseGlobalResults(
  measurement: Measurement,
  type: RecordType,
): GlobalResult[] {
  return (measurement.results ?? []).map(({ probe, result }) => {
    const base = {
      city: probe?.city ?? "Unknown city",
      country: probe?.country ?? "Unknown country",
      network: probe?.network ?? "Unknown network",
      resolver: result?.resolver ?? "Probe's system resolver",
    };
    if (result?.status !== "finished") {
      return {
        ...base,
        kind: "error",
        records: [],
        detail: "Probe did not complete the DNS lookup.",
      };
    }
    if (result.statusCode === 3) {
      return {
        ...base,
        kind: "nxdomain",
        records: [],
        detail: "Domain does not exist (NXDOMAIN).",
      };
    }
    if (result.statusCode !== 0) {
      return {
        ...base,
        kind: "error",
        records: [],
        detail: result.statusCodeName ?? "DNS lookup failed.",
      };
    }
    const records = (result.answers ?? [])
      .filter(
        (answer) => answer.type === type && typeof answer.value === "string",
      )
      .map((answer) => ({
        data: answer.value as string,
        ttl: answer.ttl ?? 0,
      }));
    return records.length
      ? { ...base, kind: "answer", records }
      : {
          ...base,
          kind: "no-record",
          records: [],
          detail: `No ${type} record found.`,
        };
  });
}

export async function checkGlobalDns(
  domain: string,
  type: RecordType,
  fetcher: typeof fetch = fetch,
  pause: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<GlobalResult[]> {
  const target = normalizeDomain(domain);
  const created = await fetcher(API, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "dns",
      target,
      locations: LOCATIONS,
      measurementOptions: { query: { type } },
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!created.ok) throw errorForStatus(created.status);
  const { id } = (await created.json()) as { id?: string };
  if (!id || !/^[a-zA-Z0-9]+$/.test(id))
    throw new Error("Globalping returned an invalid measurement ID.");

  for (let attempt = 0; attempt < 45; attempt += 1) {
    const response = await fetcher(`${API}/${id}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw errorForStatus(response.status);
    const measurement = (await response.json()) as Measurement;
    if (measurement.status !== "in-progress")
      return parseGlobalResults(measurement, type);
    await pause(750);
  }
  throw new Error("Global DNS check timed out. Try again.");
}
