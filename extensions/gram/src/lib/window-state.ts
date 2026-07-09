import { execFileSync, execSync } from "node:child_process";
import { getPreferenceValues } from "@raycast/api";

export function getOpenWindowIds(dbPath: string): {
  sessionId: string | null;
  windowIds: Set<number>;
} {
  try {
    const { build } = getPreferenceValues<Preferences>();

    try {
      execSync(`pgrep -f "${build}.app"`, { stdio: "ignore" });
    } catch {
      return { sessionId: null, windowIds: new Set() };
    }

    const result = execFileSync(
      "sqlite3",
      [
        "-cmd",
        ".timeout 5000",
        dbPath,
        "SELECT key, value FROM kv_store WHERE key IN ('session_id', 'session_window_stack')",
      ],
      { encoding: "utf8" },
    );

    let sessionId: string | null = null;
    let windowIds = new Set<number>();

    for (const line of result.trim().split("\n")) {
      const [key, value] = line.split("|");
      if (key === "session_id") {
        sessionId = value;
      } else if (key === "session_window_stack") {
        try {
          const ids = JSON.parse(value) as number[];
          windowIds = new Set(ids);
        } catch {
          // ignore parse errors
        }
      }
    }
    return { sessionId, windowIds };
  } catch {
    return { sessionId: null, windowIds: new Set() };
  }
}
