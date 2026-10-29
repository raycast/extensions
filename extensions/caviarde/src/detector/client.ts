/** The only module that knows the detector's endpoint, payload and response
 * shape, so an upstream change to an unversioned API is a one-file fix. */

const ANALYZE_PATH = "/analyze";

export interface DetectorEntity {
  readonly entity_type: string;
  readonly start: number;
  readonly end: number;
  readonly score: number;
}

export interface AnalyzeRequest {
  readonly text: string;
  readonly entities: readonly string[];
  readonly phoneRegions: readonly string[];
}

export interface AnalyzeConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly authToken: string;
}

export type AnalyzeOutcome =
  | { readonly ok: true; readonly entities: readonly DetectorEntity[] }
  | {
      readonly ok: false;
      readonly reason: "unreachable" | "timeout" | "failed";
    };

function isEntity(value: unknown): value is DetectorEntity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.entity_type === "string" &&
    Number.isInteger(candidate.start) &&
    Number.isInteger(candidate.end) &&
    typeof candidate.score === "number"
  );
}

/** Never throws and never surfaces the submitted text: every failure is a reason
 * the caller degrades on. */
export async function analyze(
  request: AnalyzeRequest,
  config: AnalyzeConfig,
): Promise<AnalyzeOutcome> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}${ANALYZE_PATH}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.authToken.length > 0)
    headers.Authorization = `Bearer ${config.authToken}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: request.text,
        entities: request.entities,
        phone_regions: request.phoneRegions,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      ok: false,
      reason: name === "TimeoutError" ? "timeout" : "unreachable",
    };
  }

  if (!response.ok) return { ok: false, reason: "failed" };

  try {
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return { ok: false, reason: "failed" };
    return { ok: true, entities: payload.filter(isEntity) };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
