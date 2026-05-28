import { LocalStorage, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";

export const execAsync = promisify(exec);

export interface RunningApp {
  name: string;
  bundleId: string;
  path: string;
  pid?: number;
}

export const HIDDEN_KEY = "hidden-bundle-ids";
export const PINNED_KEY = "pinned-bundle-ids";

export async function getRunningApps(): Promise<RunningApp[]> {
  const { stdout } = await execAsync(
    "lsappinfo list -only name,bundleID,bundlepath,type",
    {
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  const home = homedir();
  const entries = stdout.split(/^\s*\d+\)\s+/m).slice(1);
  const apps: RunningApp[] = [];

  for (const entry of entries) {
    const name = entry.match(/^"([^"]+)"/)?.[1];
    const bundleId = entry.match(/bundleID="([^"]+)"/)?.[1] ?? "";
    const path = entry.match(/bundle path="([^"]+)"/)?.[1] ?? "";
    const type = entry.match(/type="([^"]+)"/)?.[1] ?? "";
    const pidStr = entry.match(/pid = (\d+)/)?.[1];
    const pid = pidStr ? parseInt(pidStr, 10) : undefined;

    if (!name || !bundleId || type === "BackgroundOnly") continue;
    if (
      path.includes("/Contents/Frameworks/") ||
      path.includes("/Contents/Helpers/")
    )
      continue;

    const isUserApp =
      path.startsWith("/Applications/") ||
      path.startsWith(`${home}/Applications/`);
    if (type === "UIElement" && !isUserApp) continue;

    apps.push({ name, bundleId, path, pid });
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

export async function forceQuitApp(app: RunningApp): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Force quitting ${app.name}…`,
  });
  try {
    if (app.pid) {
      await execAsync(`kill -9 ${app.pid}`);
    } else if (app.bundleId) {
      await execAsync(`pkill -9 -f ${JSON.stringify(app.bundleId)}`);
    } else {
      await execAsync(`pkill -9 -x ${JSON.stringify(app.name)}`);
    }
    toast.style = Toast.Style.Success;
    toast.title = `${app.name} force quit`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to force quit ${app.name}`;
    toast.message = String(error);
  }
}

export async function restartApp(app: RunningApp): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Restarting ${app.name}…`,
  });

  try {
    if (app.bundleId) {
      await execAsync(
        `osascript -e 'tell application id "${app.bundleId}" to quit'`,
      );
    } else {
      await execAsync(`osascript -e 'tell application "${app.name}" to quit'`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (app.bundleId) {
      await execAsync(`open -b "${app.bundleId}"`);
    } else if (app.path) {
      await execAsync(`open "${app.path}"`);
    } else {
      await execAsync(`open -a "${app.name}"`);
    }

    toast.style = Toast.Style.Success;
    toast.title = `${app.name} restarted`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to restart ${app.name}`;
    toast.message = String(error);
  }
}

export async function loadHidden(): Promise<Map<string, RunningApp>> {
  const raw = await LocalStorage.getItem<string>(HIDDEN_KEY);
  if (!raw) return new Map();
  try {
    const arr = JSON.parse(raw) as RunningApp[];
    return new Map(arr.map((a) => [a.bundleId, a]));
  } catch {
    return new Map();
  }
}

export async function saveHidden(
  hidden: Map<string, RunningApp>,
): Promise<void> {
  await LocalStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden.values()]));
}

export async function loadPinned(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINNED_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function savePinned(pinned: string[]): Promise<void> {
  await LocalStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
}

// Fuzzy match score: 0 = no match, higher = better.
// Substring matches score highest; otherwise checks ordered-char match with consecutive-run bonus.
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  const subIdx = t.indexOf(q);
  if (subIdx !== -1) return 10000 - subIdx + (subIdx === 0 ? 100 : 0);

  let qi = 0;
  let score = 0;
  let lastIdx = -2;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += lastIdx === i - 1 ? 10 : 1;
      if (i === 0) score += 5;
      lastIdx = i;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  if (!query.trim()) return items;
  const scored = items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.item);
}
