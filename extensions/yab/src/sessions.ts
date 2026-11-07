import { cli, isRunning } from "./yab";
import { sessions, SessionRow } from "./parse";

export type Group = "waiting" | "working" | "outside" | "done";

export function groupOf(row: SessionRow): Group {
  if (row.waiting || /wait|needs|asking/.test(row.state)) return "waiting";
  if (/start|run|sign|work|think/.test(row.state)) return "working";
  if (row.state === "attached") return "outside";
  return "done";
}

export async function listSessions({ launch = true }: { launch?: boolean } = {}): Promise<SessionRow[] | null> {
  if (!launch && !(await isRunning())) return null;
  const json = await cli(["session", "list", "--json"]);
  const rows = sessions(json.stdout);
  if (rows.length || json.stdout.trim().startsWith("[")) return rows;
  return sessions((await cli(["session", "list"])).stdout);
}

/** "4m ago" in words, never a dot (docs: words over marks). */
export function ago(iso?: string): string | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
