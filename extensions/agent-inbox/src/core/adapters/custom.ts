import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADAPTERS_DIR } from "../paths";
import { activateBundle } from "../terminal";
import { jumpToCli, openUrl } from "../jump";
import { Config, Session } from "../types";
import { Adapter } from "./types";

/**
 * A custom adapter is a JSON manifest in ~/.sessions/adapters/<id>.json. Its agent reports events
 * with `agent-inbox event ...`; the manifest only says how to jump back.
 */
export interface AdapterManifest {
  id: string;
  name: string;
  /** URL template for desktop sessions, e.g. "t3code://threads/{sessionId}" */
  jumpUrl?: string;
  /** Command template to resume a CLI session, e.g. "t3 resume {sessionId}" */
  resumeCommand?: string;
  /** App to activate when nothing else works. */
  bundleId?: string;
}

const fill = (tpl: string, s: Session) => tpl.split("{sessionId}").join(s.sessionId).split("{cwd}").join(s.cwd);

export function manifestAdapter(m: AdapterManifest): Adapter {
  return {
    id: m.id,
    name: m.name || m.id,
    detect: () => ({ present: true, hooked: true, hosts: [] }),
    planInstall: () => ({ changes: [], notes: [] }),
    planUninstall: () => ({ changes: [], notes: [] }),
    async jump(session: Session, config: Config) {
      if (m.jumpUrl && (session.host === "app" || !m.resumeCommand)) {
        if (await openUrl(fill(m.jumpUrl, session))) return { ok: true, method: "url" };
      }
      if (m.resumeCommand) return jumpToCli(session, fill(m.resumeCommand, session), config);
      if (m.bundleId) return { ok: await activateBundle(m.bundleId), method: "activate" };
      return { ok: false, method: "none" };
    },
  };
}

export function loadManifests(dir = ADAPTERS_DIR): AdapterManifest[] {
  const out: AdapterManifest[] = [];
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return out;
  }
  for (const f of files) {
    try {
      const m = JSON.parse(readFileSync(join(dir, f), "utf8")) as AdapterManifest;
      if (m && typeof m.id === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(m.id) && m.id !== "claude" && m.id !== "codex") out.push(m);
    } catch {
      // skip invalid manifests
    }
  }
  return out;
}

const README = `# Agent Inbox adapters

Each JSON file here adds one agent. Example \`t3code.json\`:

    {
      "id": "t3code",
      "name": "t3code",
      "jumpUrl": "t3code://threads/{sessionId}",
      "resumeCommand": "t3 resume {sessionId}"
    }

The agent reports events with the CLI (run it from the agent's own hook so the terminal is captured):

    node ~/.sessions/bin/agent-inbox.mjs event --agent t3code --session <id> --type needs_input --summary "..." [--title "..."] [--cwd "$PWD"] [--host cli|app]

Event types: started · progress · needs_input · stopped · failed · quota · ended
`;

export function ensureAdaptersDir(dir = ADAPTERS_DIR): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const readme = join(dir, "README.md");
  if (!existsSync(readme)) writeFileSync(readme, README);
  return dir;
}
