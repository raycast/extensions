import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { attachedClientPid, ENV, focus, PaneRef, tuiosBin } from "./tuios";

const run = promisify(execFile);

interface Terminal {
  app: string; // name for `open -a`
  match: RegExp; // matches its process name in `ps`
  launch: (cmd: string[]) => Promise<unknown>; // open a new window running cmd
}

const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const osa = (script: string) => run("/usr/bin/osascript", ["-e", script]);
const openNew = (app: string, args: string[]) => run("/usr/bin/open", ["-na", app, "--args", ...args], { env: ENV });

export const TERMINALS: Terminal[] = [
  { app: "Ghostty", match: /ghostty/i, launch: (c) => openNew("Ghostty", ["-e", ...c]) },
  { app: "WezTerm", match: /wezterm/i, launch: (c) => openNew("WezTerm", ["start", "--", ...c]) },
  { app: "kitty", match: /kitty/i, launch: (c) => openNew("kitty", c) },
  { app: "Alacritty", match: /alacritty/i, launch: (c) => openNew("Alacritty", ["-e", ...c]) },
  {
    app: "iTerm",
    match: /iTerm/i,
    launch: (c) =>
      osa(`tell application "iTerm" to create window with default profile command "${c.map(q).join(" ")}"`),
  },
  {
    app: "Terminal",
    match: /Terminal\.app/i,
    launch: (c) => osa(`tell application "Terminal"\nactivate\ndo script "${c.map(q).join(" ")}"\nend tell`),
  },
];

async function parentOf(pid: number): Promise<{ ppid: number; comm: string } | undefined> {
  try {
    const { stdout } = await run("/bin/ps", ["-o", "ppid=,comm=", "-p", String(pid)]);
    const m = stdout.trim().match(/^(\d+)\s+(.*)$/);
    return m ? { ppid: Number(m[1]), comm: m[2] } : undefined;
  } catch {
    return undefined;
  }
}

/** Which terminal app is showing this tuios session? Walks up from the attached client's process. */
export async function terminalFor(session: string): Promise<Terminal | undefined> {
  let pid = await attachedClientPid(session);
  for (let hops = 0; pid && pid > 1 && hops < 12; hops++) {
    const p = await parentOf(pid);
    if (!p) return undefined;
    const hit = TERMINALS.find((t) => t.match.test(p.comm));
    if (hit) return hit;
    pid = p.ppid;
  }
  return undefined;
}

/** Bring forward the terminal showing `session`, or open the preferred one attached to it. Returns the app name. */
export async function showSession(session: string): Promise<string> {
  const t = await terminalFor(session);
  if (t) {
    await run("/usr/bin/open", ["-a", t.app]);
    return t.app;
  }
  const want = getPreferenceValues<Preferences>().fallbackTerminal || "Terminal";
  const fallback = TERMINALS.find((x) => x.app === want) ?? TERMINALS[TERMINALS.length - 1];
  await fallback.launch([tuiosBin(), "attach", session]);
  return `${fallback.app} (new window)`;
}

/** Focus the pane, then bring its session's terminal to the front. Returns the app name. */
export async function jumpTo(a: PaneRef): Promise<string> {
  await focus(a);
  return showSession(a.session);
}
