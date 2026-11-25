import { execFile } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type DevelopedExtension = { root: string; name: string };

/**
 * The extension being developed, found through its `ray develop` process (what `npm run dev` runs).
 * Raycast's window does not say which extension it shows, so this is the closest signal. Returns
 * undefined when none or more than one is running: with two, there is no way to tell which is shown.
 */
export async function findDevelopedExtension(): Promise<DevelopedExtension | undefined> {
  let pids: string[];
  try {
    const { stdout } = await execFileAsync("/usr/bin/pgrep", ["-f", "ray develop"]);
    pids = stdout.split("\n").filter(Boolean);
  } catch {
    return undefined; // pgrep exits 1 when nothing matches
  }

  const roots = new Set<string>();
  for (const pid of pids) {
    try {
      const { stdout } = await execFileAsync("/usr/sbin/lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"]);
      const cwd = stdout
        .split("\n")
        .find((line) => line.startsWith("n"))
        ?.slice(1);
      if (cwd && existsSync(join(cwd, "package.json"))) roots.add(cwd);
    } catch {
      // A dev server whose folder can't be read might be the one on screen: don't guess.
      return undefined;
    }
  }
  if (roots.size !== 1) return undefined;

  const [root] = roots;
  try {
    const { name } = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name?: unknown };
    return typeof name === "string" && name ? { root, name } : undefined;
  } catch {
    return undefined;
  }
}

/** A filename part: path separators would write into a subfolder. */
const safe = (value: string) => value.replace(/[/:]/g, "-");

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Expands the Screenshot Name tokens: %e extension name, %i the lowest unused number, and
 * %y %m %d %H %M %S for the date and time. Without %i, a taken name gets `-2`, `-3`… appended.
 */
export function buildFilePath(
  directory: string,
  template: string | undefined,
  extension: string,
  extensionName: string | undefined,
  now = new Date(),
): string {
  const values: Record<string, string> = {
    e: extensionName ?? "Metadata",
    y: String(now.getFullYear()),
    m: pad(now.getMonth() + 1),
    d: pad(now.getDate()),
    H: pad(now.getHours()),
    M: pad(now.getMinutes()),
    S: pad(now.getSeconds()),
  };
  const pattern = template?.trim() || "%e-%i";
  const name = (index: string) =>
    safe(pattern.replace(/%([eiymdHMS])/g, (_, token: string) => (token === "i" ? index : values[token])));
  const pathFor = (index: string) => join(directory, `${name(index)}.${extension}`);

  if (pattern.includes("%i")) {
    let index = 1;
    while (existsSync(pathFor(String(index)))) index++;
    return pathFor(String(index));
  }

  const base = name("");
  let candidate = join(directory, `${base}.${extension}`);
  for (let index = 2; existsSync(candidate); index++) {
    candidate = join(directory, `${base}-${index}.${extension}`);
  }
  return candidate;
}
