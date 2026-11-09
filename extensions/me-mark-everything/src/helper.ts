import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Methods,
  Request,
  Response,
  Query,
  QueryResult,
  Entity,
  Command,
  CommandResult,
  CommandStatus,
} from "./core-api";
export type { Entity, Command, QueryResult, Query } from "./core-api";
export class Failure extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type Installation = {
  executable: string;
  args: string[];
  protocol: 1;
  extensionId: string;
  libraryId?: string;
};
export type Session = {
  installation: Installation;
  libraryId: string;
  version: string;
  discoveryPath: string;
  notice?: string;
};
export type Discovery = {
  installation: Installation;
  discoveryPath: string;
  notice?: string;
};
export type Status = {
  local: string;
  configured: boolean;
  pending: number;
  syncing: boolean;
  conflicts: number;
  revision: string;
  sync: { error?: unknown; lastSuccess?: number };
  library: { libraryId: string; name?: string };
};
const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
/** The installed ME records the daily assistant here; see docs/INSTALL.md of the main product. */
export function dailyRecord(): string {
  return join(
    process.platform === "win32"
      ? process.env.LOCALAPPDATA || ""
      : join(homedir(), "Library", "Application Support"),
    "me-raindrop",
    "helper-install.json",
  );
}
/** Executable layout of the retired ME - Mark Everything 0.2.x assistant. */
const RETIRED = /[/\\]me-mark-everything[/\\]/;
async function readRecord(path: string): Promise<Installation> {
  let data: unknown;
  try {
    data = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new Failure(
      code === "ENOENT" ? "HELPER_MISSING" : code === "EACCES" ? "PERMISSION" : "INVALID_RECORD",
      `Cannot read ME connection configuration at ${path}: ${error instanceof Error ? error.message : String(error)}. Select a valid helper-install.json in extension preferences.`,
    );
  }
  if (
    !obj(data) ||
    data.protocol !== 1 ||
    typeof data.executable !== "string" ||
    !isAbsolute(data.executable) ||
    !Array.isArray(data.args) ||
    !data.args.every((a: unknown) => typeof a === "string") ||
    !data.args.includes("--stdio") ||
    typeof data.extensionId !== "string" ||
    !/^[a-p]{32}$/.test(data.extensionId)
  )
    throw new Failure(
      "VERSION",
      "The helper discovery record at " +
        path +
        " is invalid or incompatible. Repair the main product installation.",
    );
  return data as Installation;
}
export async function discover(override?: string, daily = dailyRecord()): Promise<Discovery> {
  const path = override?.trim() || daily;
  if (!isAbsolute(path)) throw new Failure("PATH", "Select an absolute helper-install.json path.");
  const installation = await readRecord(path);
  if (path !== daily && RETIRED.test(installation.executable)) {
    return {
      installation: await readRecord(daily),
      discoveryPath: daily,
      notice:
        "Ignoring the retired ME 0.2 helper record. Clear Helper Discovery Record in extension preferences.",
    };
  }
  return { installation, discoveryPath: path };
}
export function rpc<K extends keyof Methods, T = unknown>(
  installation: Installation,
  method: K,
  params: Methods[K],
  libraryId?: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  if (options.signal?.aborted) return Promise.reject(new Failure("CANCELLED", "Cancelled"));
  const req: Request<K> = {
    v: 1,
    id: randomUUID(),
    method,
    params,
    ...(libraryId ? { libraryId } : {}),
  };
  return new Promise((resolve, reject) => {
    const child = spawn(installation.executable, installation.args, {
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = Buffer.alloc(0),
      stderr = 0,
      done = false;
    const finish = (error?: Error, result?: T) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      if (error) {
        // Do not permit recovery until this process has actually stopped.
        if (child.exitCode !== null || child.signalCode !== null) reject(error);
        else {
          child.once("close", () => reject(error));
          child.kill();
        }
      } else resolve(result as T);
    };
    const cancel = () =>
      finish(new Failure("CANCELLED", "Cancelled; submitted writes may already be saved."));
    const timer = setTimeout(
      () =>
        finish(
          new Failure(
            method === "execute" ? "COMMIT_UNKNOWN" : "TIMEOUT",
            "The helper did not reply. Keep the original submission and check its status.",
          ),
        ),
      options.timeoutMs ?? 10000,
    );
    options.signal?.addEventListener("abort", cancel, { once: true });
    child.on("error", (e: NodeJS.ErrnoException) =>
      finish(
        new Failure(
          e.code === "ENOENT" ? "HELPER_MISSING" : e.code === "EACCES" ? "PERMISSION" : "HELPER_START",
          "Cannot start the ME helper. Repair installation or its path.",
        ),
      ),
    );
    child.stdin.on("error", () => {});
    child.stdout.on("data", (b: Buffer) => {
      out = Buffer.concat([out, b]);
      if (out.length > 1000000)
        finish(new Failure("TOO_LARGE", "Helper response exceeds the protocol limit."));
    });
    child.stderr.on("data", (b: Buffer) => {
      stderr += b.length;
      if (stderr > 65536) finish(new Failure("HELPER_OUTPUT", "Helper diagnostics exceeded the limit."));
    });
    child.on("close", (code) => {
      if (done) return;
      if (code !== 0)
        return finish(
          new Failure(
            method === "execute" ? "COMMIT_UNKNOWN" : "HELPER_EXIT",
            "The helper exited before confirming the result.",
          ),
        );
      try {
        const r = JSON.parse(out.toString("utf8").trim()) as Response<T>;
        if (!obj(r) || r.v !== 1)
          throw new Failure("VERSION", "Helper protocol mismatch. Update compatible components.");
        // Formal v1 permits id-less error envelopes from outer OS exception handling.
        if (r.id !== req.id && !(r.ok === false && (r.id === undefined || r.id === null)))
          throw new Failure("RESPONSE_MISMATCH", "Helper response does not match this request.");
        if (r.ok === false) {
          if (!obj(r.error) || typeof r.error.code !== "string" || typeof r.error.message !== "string")
            throw Error();
          throw new Failure(r.error.code, r.error.message);
        }
        if (r.ok !== true || !("result" in r)) throw Error();
        finish(undefined, r.result);
      } catch (e) {
        finish(
          e instanceof Failure
            ? e
            : new Failure("INVALID_RESPONSE", "Invalid helper response. A write may already be saved."),
        );
      }
    });
    child.stdin.end(JSON.stringify(req) + "\n");
  });
}
export async function handshake(location: Awaited<ReturnType<typeof discover>>): Promise<Session> {
  const c = await rpc(location.installation, "capabilities", {});
  const commands = obj(c) && Array.isArray(c.commands) ? c.commands : [];
  if (
    !obj(c) ||
    c.protocol !== 1 ||
    c.schema !== 1 ||
    typeof c.version !== "string" ||
    !Array.isArray(c.commands) ||
    !["query", "get", "execute", "commandStatus", "status", "openManager", "managerStatus"].every((x) =>
      commands.includes(x),
    )
  )
    throw new Failure("VERSION", "Incompatible ME helper.");
  if (!obj(c.library) || typeof c.library.libraryId !== "string")
    throw new Failure("NOT_BOUND", "Open the browser manager and bind a library first.");
  if (location.installation.libraryId && location.installation.libraryId !== c.library.libraryId)
    throw new Failure(
      "LIBRARY_MISMATCH",
      "The installation is bound to a different library. Reopen the command after checking settings.",
    );
  return { ...location, libraryId: c.library.libraryId, version: c.version };
}
export function entity(x: unknown): asserts x is Entity {
  if (
    !obj(x) ||
    typeof x.id !== "string" ||
    typeof x.kind !== "string" ||
    !["bookmark", "collection", "tag"].includes(x.kind) ||
    !obj(x.values) ||
    !obj(x.heads) ||
    !obj(x.conflicts) ||
    !obj(x.policies) ||
    !Array.isArray(x.structural) ||
    typeof x.purged !== "boolean" ||
    !Object.values(x.heads).every((v) => Array.isArray(v) && v.every((t) => typeof t === "string"))
  )
    throw new Failure("INVALID_RESPONSE", "Invalid bookmark data from helper.");
}
export async function queryAll(
  session: Session,
  query: Query = {},
  signal?: AbortSignal,
): Promise<QueryResult> {
  for (let restart = 0; restart < 3; restart++) {
    let offset = 0,
      limit = 100,
      revision: string | undefined,
      total = 0;
    const items: QueryResult["items"] = [];
    while (true) {
      let r: QueryResult;
      try {
        r = await rpc(session.installation, "query", { ...query, offset, limit }, session.libraryId, {
          signal,
        });
      } catch (e) {
        if (e instanceof Failure && e.code === "TOO_LARGE" && limit > 1) {
          limit = Math.max(1, Math.floor(limit / 2));
          continue;
        }
        throw e;
      }
      if (
        !obj(r) ||
        !Array.isArray(r.items) ||
        typeof r.revision !== "string" ||
        !Number.isInteger(r.total) ||
        r.total < 0
      )
        throw new Failure("INVALID_RESPONSE", "Invalid query page.");
      for (const e of r.items) {
        entity(e);
        if (
          !Array.isArray(e.tags) ||
          !e.tags.every((t) => typeof t === "string") ||
          typeof e.candidateMatch !== "boolean"
        )
          throw new Failure("INVALID_RESPONSE", "Invalid query item.");
      }
      if (revision !== undefined && revision !== r.revision) break;
      revision = r.revision;
      total = r.total;
      if (!r.items.length && offset < total) throw new Failure("INVALID_RESPONSE", "Incomplete query page.");
      items.push(...r.items);
      offset += r.items.length;
      if (offset >= total) {
        if (new Set(items.map((x) => x.id)).size !== items.length)
          throw new Failure("INVALID_RESPONSE", "Duplicate items across pages.");
        return { items, total, revision };
      }
    }
  }
  throw new Failure("BUSY", "The library changed during pagination. Please refresh.");
}
export async function status(s: Session): Promise<Status> {
  const x = await rpc(s.installation, "status", {}, s.libraryId);
  if (
    !obj(x) ||
    !obj(x.library) ||
    x.library.libraryId !== s.libraryId ||
    typeof x.configured !== "boolean" ||
    typeof x.pending !== "number" ||
    typeof x.syncing !== "boolean" ||
    typeof x.conflicts !== "number" ||
    typeof x.revision !== "string" ||
    !obj(x.sync)
  )
    throw new Failure("INVALID_RESPONSE", "Invalid library status.");
  return x as Status;
}
export function statusText(s: Status) {
  return [
    !s.configured
      ? "Local only"
      : s.syncing
        ? "Syncing"
        : s.sync.error
          ? "Sync needs attention"
          : s.pending
            ? "Pending sync"
            : typeof s.sync.lastSuccess === "number" && s.sync.lastSuccess > 0
              ? "Synced"
              : "Not yet synced",
    s.conflicts ? `${s.conflicts} conflicts` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
export type Submission = { session: Session; command: Command };
export async function getBookmark(s: Session, id: string): Promise<Entity> {
  const result = await rpc(s.installation, "get", { id }, s.libraryId);
  entity(result);
  if (result.id !== id || result.kind !== "bookmark")
    throw new Failure("INVALID_RESPONSE", "Helper returned a different entity or kind.");
  return result;
}
export async function submissionSession(p: Submission) {
  if (p.command.libraryId !== p.session.libraryId)
    throw new Failure("LIBRARY_MISMATCH", "Submission library mismatch.");
  const current = await handshake(p.session);
  if (current.libraryId !== p.session.libraryId)
    throw new Failure("LIBRARY_MISMATCH", "Restore the original library before checking this submission.");
}
export async function commandState(p: Submission): Promise<CommandStatus> {
  const state = await rpc<"commandStatus", CommandStatus>(
    p.session.installation,
    "commandStatus",
    { id: p.command.id },
    p.session.libraryId,
  );
  if (
    !obj(state) ||
    typeof state.revision !== "string" ||
    !["not-found", "committed-recovering", "committed-readable"].includes(state.state)
  )
    throw new Failure("INVALID_RESPONSE", "Invalid command status.");
  return state;
}
export type SubmitPhase = "checking" | "execute" | "readable" | "committed" | "recovering";
export async function submit(
  p: Submission,
  timeoutMs = 10000,
  controls: { phase?: (phase: SubmitPhase) => Promise<void>; beforeReplay?: () => Promise<void> } = {},
): Promise<CommandResult> {
  await controls.phase?.("checking");
  await submissionSession(p);
  const state = await commandState(p);
  if (state.state === "committed-recovering") {
    await controls.phase?.("recovering");
    throw new Failure(
      "COMMITTED_RECOVERING",
      "Saved operation is waiting for dependencies. Open the ME manager.",
    );
  }
  if (state.state === "committed-readable") await controls.phase?.("readable");
  else await controls.beforeReplay?.();
  // An identical replay verifies requestHash and repairs the receipt/cache.
  await controls.phase?.("execute");
  const r = await rpc<"execute", CommandResult>(
    p.session.installation,
    "execute",
    p.command,
    p.session.libraryId,
    { timeoutMs },
  );
  if (
    !obj(r) ||
    !["committed-readable", "no-change"].includes(r.state) ||
    typeof r.revision !== "string" ||
    (r.state === "committed-readable" && (r.commandId !== p.command.id || !obj(r.writtenHeads)))
  )
    throw new Failure("INVALID_RESPONSE", "Invalid save receipt. Keep the original submission.");
  await controls.phase?.("committed");
  return r;
}
/**
 * The manager is the extension page at HashRouter routes /my/0 and
 * /my/0/item/<displayId>. The helper derives that display id, so the receipt is
 * checked for its route kind, library and acknowledgement only.
 */
const MANAGER_ROUTE = /^\/my\/0(\/item\/\d+)?$/;
export type ManagerReceipt = {
  requestId: string;
  libraryId: string;
  fragment: string;
  opened: boolean;
};
export function managerReceipt(value: unknown, libraryId: string, expectsItem: boolean): ManagerReceipt {
  const r = value as ManagerReceipt;
  if (
    !obj(r) ||
    typeof r.requestId !== "string" ||
    r.libraryId !== libraryId ||
    typeof r.fragment !== "string" ||
    !MANAGER_ROUTE.test(r.fragment) ||
    (expectsItem ? !/\/item\/\d+$/.test(r.fragment) : r.fragment !== "/my/0") ||
    typeof r.opened !== "boolean"
  )
    throw new Failure("INVALID_RESPONSE", "Invalid manager confirmation.");
  return r;
}
