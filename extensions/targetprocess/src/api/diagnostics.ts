/** Names of things, never contents of things: no token, no titles, no descriptions. */

import { fetchJson, FetchOptions } from "./client";
import { connect } from "./connect";
import { Instance } from "./types";
import { redact, ROW_INCLUDE } from "./url";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

async function check(name: string, run: () => Promise<string>): Promise<CheckResult> {
  const started = Date.now();
  try {
    return { name, ok: true, detail: await run(), ms: Date.now() - started };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { name, ok: false, detail, ms: Date.now() - started };
  }
}

function fieldNames(row: Record<string, unknown>): string {
  return Object.entries(row)
    .map(([key, value]) =>
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? `${key}{${Object.keys(value as Record<string, unknown>).join(",")}}`
        : key,
    )
    .join(", ");
}

interface AssignablesResponse {
  Items?: Record<string, unknown>[];
}

export async function runDiagnostics(instance: Instance, options: FetchOptions = {}): Promise<string> {
  const url = new URL(instance.baseUrl);

  const connection = await check("connect", async () => {
    const facts = await connect(instance, options);
    return `transport ${facts.transport}, user resolved, API v2 ${facts.apiV2Available ? "available" : "unavailable"}`;
  });

  const assignables = await check("assignables", async () => {
    const { data } = await fetchJson<AssignablesResponse>(
      instance,
      "api/v1/Assignables",
      { take: 1, include: ROW_INCLUDE },
      options,
    );
    const row = data.Items?.[0];
    return row ? `fields: ${fieldNames(row)}` : "reachable, no items returned";
  });

  const lines = [
    "Targetprocess diagnostics",
    "",
    `host: ${url.host}`,
    `path prefix: ${url.pathname === "/" ? "(none)" : url.pathname}`,
    `stored transport: ${instance.authTransport ?? "(not yet negotiated)"}`,
    `stored API v2: ${instance.apiV2Available === undefined ? "(unknown)" : instance.apiV2Available}`,
    `last error: ${instance.lastError ?? "(none)"}`,
    "",
    ...[connection, assignables].map(
      (result) => `${result.ok ? "PASS" : "FAIL"}  ${result.name} (${result.ms}ms) - ${result.detail}`,
    ),
    "",
    "Structural only: no token, no entity names or descriptions.",
  ];

  return redact(lines.join("\n"), instance.token);
}
