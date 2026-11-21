import { runRex, type RexInstall } from "./cli";
import {
  hostDisplayName,
  hostKey,
  LOCAL_HOST,
  type HostError,
  type ProgramStatus,
  type RexBlock,
  type RexHost,
  type RexSession,
  type RexSnapshot,
  type RexWindow,
} from "./types";

/**
 * Collects every session, window, and block of one server in one connection.
 *
 * `rex do -` runs this script from stdin. Doing the walk in Lua means one
 * process and one connection instead of one `rex` invocation per block.
 */
const COLLECT_SCRIPT = `
local terminal = "com.superlogical.terminal"
local out = { sessions = {}, warnings = {} }

local function warn(text) out.warnings[#out.warnings + 1] = text end

local function block_info(session_id, b)
  local blk = { block_id = b.block_id, label = b.label or "", flavor = b.flavor or "", status = {} }
  if b.creator_name ~= terminal then return blk end
  local where = { session_id = session_id, block_id = b.block_id, args = {} }
  local title = rex.block.call(terminal, "title", where)
  if title and title.title then blk.title = title.title end
  local proc = rex.block.call(terminal, "process", where)
  if proc then
    local fg = proc.foreground or proc.child
    if fg then
      blk.process = {
        name = fg.name, argv0 = fg.argv0, cwd = fg.cwd, pid = fg.pid,
        invoked = fg.invoked_path and fg.invoked_path:match("([^/]+)$") or nil,
        path = fg.path and fg.path:match("([^/]+)$") or nil,
        script = fg.script and fg.script:match("([^/]+)$") or nil,
      }
      if not blk.process.cwd and proc.ancestors and proc.ancestors[1] then
        blk.process.cwd = proc.ancestors[1].cwd
      end
    end
  end
  local ps = rex.block.call(terminal, "program_status", where)
  if ps and ps.records then
    for _, r in ipairs(ps.records) do
      blk.status[#blk.status + 1] = {
        app = r.effective_app or r.app, state = r.state, kind = r.kind, msg = r.msg,
        title = r.title, progress = r.progress, updated_at = r.updated_at, id = r.id,
      }
    end
  end
  return blk
end

local list, err = rex.call("session.list")
if err ~= nil then error(tostring(err), 0) end

for _, s in ipairs(list.sessions or {}) do
  local _, aerr = rex.session.attach{ session_id = s.session_id }
  if aerr ~= nil then warn("attach " .. s.session_id .. ": " .. tostring(aerr)) end
  local view, verr = rex.session.view{ session_id = s.session_id }
  if verr ~= nil then
    warn("view " .. s.session_id .. ": " .. tostring(verr))
  else
    local entry = { session_id = s.session_id, label = s.label or "", active_window_id = view.active_window_id, windows = {} }
    for _, w in ipairs(view.windows or {}) do
      local win = { window_id = w.window_id, label = w.label or "", active = w.active or false, focused_block_id = w.focused_block_id, blocks = {} }
      for _, layer in ipairs(w.layers or {}) do
        for _, b in ipairs(layer.blocks or {}) do
          win.blocks[#win.blocks + 1] = block_info(s.session_id, b)
        end
      end
      entry.windows[#entry.windows + 1] = win
    end
    out.sessions[#out.sessions + 1] = entry
  end
  rex.session.detach{ session_id = s.session_id }
end

return out
`;

const LOCAL_TIMEOUT_MS = 10_000;
/** Remote hosts get less time so an absent laptop does not hold up the list. */
const REMOTE_TIMEOUT_MS = 6_000;

/** Lua serializes an empty table as `{}`, so an empty list may arrive as an object. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Raw = Record<string, unknown>;

function parseStatus(raw: Raw): ProgramStatus | undefined {
  const state = asString(raw.state);
  const app = asString(raw.app);
  if (!state || !app || raw.id !== undefined) return undefined; // nested records describe sub-tasks
  return {
    app,
    state,
    kind: asString(raw.kind),
    msg: asString(raw.msg),
    title: asString(raw.title),
    progress: typeof raw.progress === "number" ? raw.progress : undefined,
    updatedAt: asString(raw.updated_at),
  };
}

function parseBlock(raw: Raw): RexBlock {
  const process = raw.process && typeof raw.process === "object" ? (raw.process as Raw) : undefined;
  return {
    blockId: String(raw.block_id),
    label: asString(raw.label) ?? "",
    flavor: asString(raw.flavor) ?? "",
    title: asString(raw.title),
    process: process
      ? {
          name: asString(process.name),
          argv0: asString(process.argv0),
          cwd: asString(process.cwd),
          pid: typeof process.pid === "number" ? process.pid : undefined,
          invoked: asString(process.invoked),
          path: asString(process.path),
          script: asString(process.script),
        }
      : undefined,
    status: asArray<Raw>(raw.status)
      .map(parseStatus)
      .filter((s): s is ProgramStatus => s !== undefined),
  };
}

function parseWindow(raw: Raw): RexWindow {
  return {
    windowId: String(raw.window_id),
    label: asString(raw.label) ?? "",
    active: raw.active === true,
    focusedBlockId: asString(raw.focused_block_id),
    blocks: asArray<Raw>(raw.blocks).map(parseBlock),
  };
}

function parseSession(raw: Raw, host: RexHost): RexSession {
  return {
    sessionId: String(raw.session_id),
    label: asString(raw.label) ?? "",
    activeWindowId: asString(raw.active_window_id),
    windows: asArray<Raw>(raw.windows).map(parseWindow),
    host,
  };
}

function parseHost(raw: Raw): RexHost {
  return {
    label: asString(raw.label) ?? "",
    endpoint: asString(raw.endpoint),
    thisMachine: raw.this_machine === true,
    icon: asString(raw.icon),
  };
}

/** This Mac plus every remote host from `rex hosts`. */
export async function listHosts(install: RexInstall, signal?: AbortSignal): Promise<RexHost[]> {
  const stdout = await runRex(install, ["hosts", "--json"], { timeout: 4_000, signal });
  const raw = JSON.parse(stdout) as Raw;
  const hosts: RexHost[] = [];
  if (raw.home && typeof raw.home === "object") hosts.push(parseHost(raw.home as Raw));
  for (const entry of asArray<Raw>(raw.hosts)) hosts.push(parseHost(entry));
  if (!hosts.some((host) => host.thisMachine)) hosts.unshift(LOCAL_HOST);
  const seen = new Set<string>();
  return hosts.filter((host) => {
    const key = hostKey(host);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface HostCollection {
  sessions: RexSession[];
  warnings: string[];
}

async function collectHost(install: RexInstall, host: RexHost, signal?: AbortSignal): Promise<HostCollection> {
  const stdout = await runRex(install, ["do", "-"], {
    input: COLLECT_SCRIPT,
    host,
    signal,
    timeout: host.thisMachine ? LOCAL_TIMEOUT_MS : REMOTE_TIMEOUT_MS,
  });
  const raw = JSON.parse(stdout) as Raw;
  return {
    sessions: asArray<Raw>(raw.sessions).map((session) => parseSession(session, host)),
    warnings: asArray<string>(raw.warnings),
  };
}

/** Every session on every reachable host. Hosts are read in parallel so a slow one cannot block the rest. */
export async function fetchSnapshot(install: RexInstall, signal?: AbortSignal): Promise<RexSnapshot> {
  const warnings: string[] = [];
  let hosts: RexHost[];
  try {
    hosts = await listHosts(install, signal);
  } catch (error) {
    hosts = [LOCAL_HOST];
    warnings.push(`hosts: ${errorMessage(error)}`);
  }
  signal?.throwIfAborted();

  const results = await Promise.allSettled(hosts.map((host) => collectHost(install, host, signal)));
  const sessions: RexSession[] = [];
  const hostErrors: HostError[] = [];
  results.forEach((result, index) => {
    const host = hosts[index];
    if (result.status === "fulfilled") {
      sessions.push(...result.value.sessions);
      warnings.push(...result.value.warnings.map((warning) => `${hostDisplayName(host)}: ${warning}`));
    } else {
      hostErrors.push({ host, message: errorMessage(result.reason) });
    }
  });

  if (hostErrors.length === hosts.length) {
    const local = results[hosts.findIndex((host) => host.thisMachine)] ?? results[0];
    throw local.status === "rejected" ? local.reason : new Error("No Rex host could be read.");
  }

  return { sessions, hosts, hostErrors, warnings, fetchedAt: new Date().toISOString() };
}

/** The current screen of a terminal block, trailing blank lines removed. */
export async function captureBlock(
  install: RexInstall,
  session: RexSession,
  blockId: string,
  signal?: AbortSignal,
): Promise<string> {
  return runRex(install, ["capture", "-s", session.sessionId, "-b", blockId, "--trim"], {
    host: session.host,
    signal,
  });
}
