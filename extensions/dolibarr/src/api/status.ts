import type { DolibarrConfig } from "../preferences";

export type ProbeResponse = {
  ok: boolean;
  status: number;
  contentType: string | null;
  text(): Promise<string>;
};

export type ProbeFetch = (url: string, init: { headers: Record<string, string> }) => Promise<ProbeResponse>;

export type Diagnosis =
  | { ok: true; version: string }
  | {
      ok: false;
      /**
       * network       — address unreachable: wrong host, no route, instance down
       * not-dolibarr  — something answered, but it is not a Dolibarr API
       * unauthorized  — it is a Dolibarr API, but the key was rejected
       * http          — the API answered with an unexpected status
       */
      reason: "network" | "not-dolibarr" | "unauthorized" | "http";
      detail: string;
    };

function describeCause(error: unknown): string {
  const cause = error instanceof Error ? (error.cause as { code?: string; message?: string } | undefined) : undefined;
  return cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : String(error));
}

async function defaultProbe(url: string, init: { headers: Record<string, string> }): Promise<ProbeResponse> {
  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type"),
    text: () => response.text(),
  };
}

/**
 * Distinguishes the failure modes a regular expression on the URL cannot: a wrong address, a URL
 * pointing at the web interface instead of the API, and a rejected key all look alike otherwise.
 * The API key never appears in the returned detail.
 */
export async function checkConnection(
  config: DolibarrConfig,
  probe: ProbeFetch = defaultProbe as ProbeFetch,
): Promise<Diagnosis> {
  const url = `${config.baseUrl}/status`;

  let response: ProbeResponse;
  try {
    response = await probe(url, { headers: { DOLAPIKEY: config.apiKey, Accept: "application/json" } });
  } catch (error) {
    return { ok: false, reason: "network", detail: describeCause(error) };
  }

  // A Dolibarr API always answers JSON — HTML means the URL points at the web interface.
  if (response.contentType !== null && !response.contentType.includes("json")) {
    return {
      ok: false,
      reason: "not-dolibarr",
      detail: `The address responds with ${response.contentType} instead of JSON.`,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason: "unauthorized",
      detail: `The API rejected the key (HTTP ${response.status}).`,
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "http", detail: `Unexpected API response (HTTP ${response.status}).` };
  }

  const body = await response.text();
  let version: unknown;
  try {
    const parsed = JSON.parse(body) as { success?: { dolibarr_version?: unknown } };
    version = parsed.success?.dolibarr_version;
  } catch {
    return { ok: false, reason: "not-dolibarr", detail: "The response is not valid JSON." };
  }

  if (typeof version !== "string") {
    return {
      ok: false,
      reason: "not-dolibarr",
      detail: "The response contains no Dolibarr version.",
    };
  }

  return { ok: true, version };
}
