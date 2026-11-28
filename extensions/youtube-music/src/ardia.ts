import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cli = join(homedir(), ".local", "bin", "ardia");
const musicOrigin = "https://music.youtube.com";
const youtubeOrigins = ["https://www.youtube.com", "https://youtube.com", "https://m.youtube.com"];
type Scope = "music" | "youtube" | "both";
const targets = new Map<Scope, { tabId: string; origin: string }>();

async function browse<T>(...args: string[]): Promise<T> {
  const { stdout } = await exec(cli, ["browse", "--json", ...args], { timeout: 5000, maxBuffer: 8 * 1024 * 1024 });
  const reply = JSON.parse(stdout);
  if (!reply.success) throw new Error("Ardia CLI request failed");
  return reply.data as T;
}

export async function runInArdia(script: string, scope: Scope): Promise<string | undefined> {
  let target = targets.get(scope);
  if (!target) {
    const origins =
      scope === "music" ? [musicOrigin] : scope === "youtube" ? youtubeOrigins : [musicOrigin, ...youtubeOrigins];
    const { tabs } = await browse<{ tabs: { url: string; tabId: string }[] }>("tab", "list");
    const tab = tabs.find(({ url }) => origins.some((origin) => url.startsWith(`${origin}/`)));
    if (!tab) return undefined;
    target = { tabId: tab.tabId, origin: new URL(tab.url).origin };
    targets.set(scope, target);
  }

  try {
    // Address the tab directly, without changing focus or relying on the CLI's selected tab.
    // Recheck the origin inside the same evaluation in case the tab has since navigated.
    const { result } = await browse<{ result: { exceptionDetails?: unknown; result: { value?: string | null } } }>(
      "cdp",
      "Runtime.evaluate",
      "--target",
      target.tabId,
      "--params",
      JSON.stringify({
        expression: `if (location.origin === ${JSON.stringify(target.origin)}) {\n${script}\n} else { null; }`,
        returnByValue: true,
        allowUnsafeEvalBlockedByCSP: false,
      })
    );
    if (result.exceptionDetails) throw new Error("Ardia could not execute the player script");
    if (result.result.value === null) {
      targets.delete(scope);
      return undefined;
    }
    if (typeof result.result.value !== "string") throw new Error("Unexpected Ardia player result");
    return result.result.value;
  } catch (error) {
    // Rediscover on the next poll, but never replay an action that might already have run.
    targets.delete(scope);
    throw error;
  }
}
