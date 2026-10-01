import {
  findSkills,
  getLogs,
  getTraces,
  getValDetail,
  getValHistory,
  listBlobs,
  listFiles,
  listOrgs,
  listVals,
  readBlob,
  readFile,
  sqliteExecute,
} from "../src/lib/api";
import { parseEventStream } from "../src/lib/sse";
import { loadState } from "../src/lib/store";
import getValInfo from "../src/tools/get-val-info";
import getValRuns from "../src/tools/get-val-runs";
import listTools from "../src/tools/list-tools";
import loadSkill from "../src/tools/load-skill";
import readValBlobs from "../src/tools/read-val-blobs";

const token = process.env.VAL_TOWN_TOKEN;
if (!token) {
  console.error("Set VAL_TOWN_TOKEN to a Val Town API token.");
  process.exit(1);
}

// Every argument src/lib/api.ts sends, by tool. Update both together.
const SENT: Record<string, string[]> = {
  list_vals: ["limit", "sortBy", "name", "updatedAfter"],
  update_val: ["val", "privacy"],
  find_val_town_skills: ["query", "limit"],
  get_val_detail: ["val"],
  list_files: ["val", "branch", "path"],
  read_file: ["val", "path", "show_line_numbers", "branch"],
  get_logs: ["fileId", "end", "traceIds"],
  get_traces: ["fileId"],
  read_interval_settings: ["val", "path", "branch"],
  get_val_history: ["val", "limit", "branch"],
  run_file: ["val", "path", "branch"],
  sqlite_execute: ["sql", "database"],
  listBlobs: ["storage", "prefix"],
  readBlob: ["key", "storage"],
  storeBlob: ["key", "content", "storage"],
  list_orgs: [],
};

let failed = false;

async function check<T>(name: string, run: () => Promise<T>): Promise<T | undefined> {
  try {
    const result = await run();
    console.log(`ok    ${name}`);
    return result;
  } catch (error) {
    // The log is public, and what follows the colon can quote the account's data.
    const reason = error instanceof Error ? error.message.split(":")[0] : "unknown error";
    console.error(`FAIL  ${name}: ${reason}`);
    failed = true;
  }
}

function has(value: unknown, field: string): asserts value {
  if (!value) throw new Error(`reply has no ${field}`);
}

type ToolSchema = { name: string; inputSchema: { properties?: Record<string, unknown>; required?: string[] } };

async function toolSchemas(): Promise<ToolSchema[]> {
  const response = await fetch("https://api.val.town/v3/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  if (!response.ok) throw new Error(`tools/list answered HTTP ${response.status}`);
  const message = parseEventStream(await response.text(), 1) as { result?: { tools?: ToolSchema[] } };
  has(message.result?.tools, "tools");
  return message.result.tools;
}

await check("tool arguments", async () => {
  const schemas = new Map((await toolSchemas()).map((tool) => [tool.name, tool.inputSchema]));
  const drift = Object.entries(SENT).flatMap(([name, sent]) => {
    const schema = schemas.get(name);
    if (!schema) return [`${name} no longer exists`];
    const known = Object.keys(schema.properties ?? {});
    return [
      ...sent.filter((arg) => !known.includes(arg)).map((arg) => `${name} no longer takes ${arg}`),
      ...(schema.required ?? []).filter((arg) => !sent.includes(arg)).map((arg) => `${name} now requires ${arg}`),
    ];
  });
  if (drift.length) throw new Error(drift.join("; "));
});

const orgs = await check("list_orgs", async () => {
  const reply = await listOrgs();
  has(reply.user?.handle, "user.handle");
  has(Array.isArray(reply.orgs), "orgs");
  return reply;
});
await check("list_vals", async () => has(Array.isArray((await listVals({ limit: 1 })).vals), "vals"));
await check("find_val_town_skills", async () => has(Array.isArray((await findSkills("sqlite")).matches), "matches"));

const handle = orgs?.orgs.find((org) => org.isPersonal)?.handle ?? orgs?.user.handle;
if (handle) {
  await check("readBlob", async () => {
    const blob = await readBlob({ type: "deprecated_global", org: handle }, "raycast:tools.json");
    has(typeof blob.content === "string", "content");
  });
}

const listed = await check("list-tools", listTools);
// list-tools drops switched-off vals, which the read tools still accept.
const vals = Object.keys((await loadState().catch(() => null))?.tools ?? {});
if (vals.length === 0) {
  console.error(`FAIL  no val to read: ${listed?.note ?? "the allow list could not be read"}`);
  process.exit(1);
}

// Not every val has runs, blobs or a database, so one val that answers is enough.
async function onAnyVal<T>(run: (val: string) => Promise<T>): Promise<T> {
  let first: unknown;
  for (const val of vals) {
    try {
      return await run(val);
    } catch (error) {
      first ??= error;
    }
  }
  throw first;
}

async function firstFile(val: string) {
  const { files } = await listFiles(val);
  has(Array.isArray(files), "files");
  const file = files.find((entry) => entry.type !== "directory");
  has(file?.id && file.path, "file id and path");
  return file;
}

await check("get_val_detail", () =>
  onAnyVal(async (val) => {
    const detail = await getValDetail(val);
    has(detail.identifier, "identifier");
    has(Array.isArray(detail.branches?.items), "branches.items");
  }),
);
await check("list_files", () => onAnyVal(firstFile));
await check("read_file", () =>
  onAnyVal(async (val) =>
    has(typeof (await readFile(val, (await firstFile(val)).path)).content === "string", "content"),
  ),
);
await check("get_val_history", () =>
  onAnyVal(async (val) => has(Array.isArray((await getValHistory(val)).history), "history")),
);
await check("get_logs", () =>
  onAnyVal(async (val) => has(Array.isArray((await getLogs((await firstFile(val)).id)).logs), "logs")),
);
await check("get_traces", () =>
  onAnyVal(async (val) => has(Array.isArray((await getTraces((await firstFile(val)).id)).traces), "traces")),
);
await check("listBlobs", () =>
  onAnyVal(async (val) => has(Array.isArray((await listBlobs({ type: "val", val })).blobs), "blobs")),
);
await check("sqlite_execute", () =>
  onAnyVal(async (val) => has(Array.isArray((await sqliteExecute(val, "SELECT 1 AS ok")).rows), "rows")),
);

await check("get-val-info", () => onAnyVal((val) => getValInfo({ val })));
await check("get-val-runs", () => onAnyVal((val) => getValRuns({ val })));
await check("read-val-blobs", () => onAnyVal((val) => readValBlobs({ val })));
await check("load-skill", () => loadSkill({ query: "sqlite" }));

process.exit(failed ? 1 : 0);
