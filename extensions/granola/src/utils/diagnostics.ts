import { environment } from "@raycast/api";
import { mkdir, readFile, appendFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export interface DiagnosticFields {
  operation?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  requestId?: string;
  serverRequestId?: string;
  code?: string;
  rotated?: boolean;
}

const directory = path.join(environment.supportPath, "diagnostics");
const command = environment.commandName.replace(/[^a-z0-9-]/gi, "").slice(0, 80) || "unknown";
const file = path.join(directory, `${command}.jsonl`);
let writes = Promise.resolve();

// An allowlist, not a redaction blacklist: callers cannot log tokens, request
// bodies, note titles, account information, raw errors, or full URLs here.
export function diagnostic(event: string, fields: DiagnosticFields = {}) {
  const record: Record<string, unknown> = {
    schema: 1,
    raycastVersion: environment.raycastVersion,
    time: new Date().toISOString(),
    command,
    platform: process.platform,
    event: /^[a-z_.-]{1,80}$/.test(event) ? event : "operation",
  };
  for (const key of ["status", "durationMs"] as const) if (typeof fields[key] === "number") record[key] = fields[key];
  if (typeof fields.rotated === "boolean") record.rotated = fields.rotated;
  if (fields.operation && /^[a-zA-Z. ]{1,100}$/.test(fields.operation)) record.operation = fields.operation;
  for (const key of ["method", "code"] as const)
    if (fields[key] && /^[a-zA-Z0-9_.-]{1,80}$/.test(fields[key]!)) record[key] = fields[key];
  for (const key of ["requestId", "serverRequestId"] as const)
    if (fields[key] && /^[a-zA-Z0-9_=-]{1,100}$/.test(fields[key]!)) record[key] = fields[key];
  if (
    fields.endpoint &&
    /^(api|stream\.api|auth)\.granola\.ai\/(v[12]|user_management)\/[a-z0-9/-]+$/.test(fields.endpoint)
  )
    record.endpoint = fields.endpoint;
  const line = JSON.stringify(record);
  console.log(`[Granola] ${line}`);
  writes = writes
    .then(async () => {
      await mkdir(directory, { recursive: true });
      try {
        if ((await stat(file)).size > 128 * 1024) await writeFile(file, "", { mode: 0o600 });
      } catch {
        /* New log. */
      }
      await appendFile(file, line + "\n", { mode: 0o600 });
    })
    .catch(() => {
      /* Diagnostics must never break a command. */
    });
}

export async function readDiagnostics(): Promise<string> {
  await writes;
  const { readdir } = await import("node:fs/promises");
  try {
    const files = (await readdir(directory)).filter((f) => /^[a-z0-9-]+\.jsonl$/i.test(f));
    const lines = (
      await Promise.all(
        files.map(async (f) => {
          const text = await readFile(path.join(directory, f), "utf8");
          return text.trim().split("\n").slice(-40);
        }),
      )
    )
      .flat()
      .filter(Boolean)
      .sort();
    return lines.slice(-200).join("\n");
  } catch {
    return "No request diagnostics recorded yet.";
  }
}

export async function diagnosticReport(): Promise<string> {
  return `Granola support report (diagnostics v1)\nRaycast: ${environment.raycastVersion}\nNode: ${process.versions.node}\nPlatform: ${process.platform}\nAPI compatibility: 7.543.0\n\n${await readDiagnostics()}`;
}
