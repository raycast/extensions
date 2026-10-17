import { execFile } from "node:child_process";
import { access, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const bundleId = "com.martingruner.diffanything";
/** The first version that opens files handed over by macOS, which the sandboxed Store app may read. */
export const minimumVersion = "1.6.1";
export const storeUrl = "macappstore://apps.apple.com/app/id6795463996";
export const planNotice =
  "The comparison opens in the Diff Anything app, with the features and limits of your Diff Anything plan. Purchase or restore Pro in the app.";
export type InstalledApp = { path: string; version: string };

export function absolutePath(input: string): string {
  const expanded = input.startsWith("~/")
    ? join(homedir(), input.slice(2))
    : input;
  if (!isAbsolute(expanded) || expanded.includes("\0"))
    throw new Error("Choose an absolute local path.");
  return expanded;
}
export async function validatePaths(
  paths: string[],
): Promise<[string, string]> {
  if (paths.length !== 2)
    throw new Error("Select exactly two files or exactly two folders.");
  const pair = paths.map(absolutePath) as [string, string];
  const info = await Promise.all(
    pair.map(async (path) => {
      try {
        await access(path, constants.R_OK);
        return await stat(path);
      } catch {
        throw new Error(
          `Cannot read ${path}. Check the path and its access permissions.`,
        );
      }
    }),
  );
  if (info.some((s) => !s.isFile() && !s.isDirectory()))
    throw new Error("Only regular files and folders are supported.");
  if (info[0].isDirectory() !== info[1].isDirectory())
    throw new Error("Compare two files or two folders, not one of each.");
  return pair;
}
export function compareVersions(a: string, b: string): number {
  const parts = (version: string) =>
    version.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}
async function appVersion(path: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/plutil",
      [
        "-extract",
        "CFBundleShortVersionString",
        "raw",
        "-o",
        "-",
        join(path, "Contents", "Info.plist"),
      ],
      { encoding: "utf8", timeout: 5_000 },
    );
    return stdout.trim();
  } catch {
    return "0";
  }
}
/** The newest installed Diff Anything, or an error that says how to install or update it. */
export async function findApp(
  applications: { path: string; bundleId?: string }[],
): Promise<InstalledApp> {
  const installed = await Promise.all(
    applications
      .filter((app) => app.bundleId === bundleId)
      .map(async (app) => ({
        path: app.path,
        version: await appVersion(app.path),
      })),
  );
  if (!installed.length)
    throw new Error(
      "Diff Anything is not installed. Install it from the Mac App Store.",
    );
  const newest = installed.sort((a, b) =>
    compareVersions(b.version, a.version),
  )[0];
  if (compareVersions(newest.version, minimumVersion) < 0)
    throw new Error(
      `This extension needs Diff Anything ${minimumVersion} or later; ${newest.version} is installed. Update it from the Mac App Store.`,
    );
  return newest;
}
/**
 * Hands the pair to the app through macOS, left then right. Files opened this way are ones the
 * sandboxed Mac App Store app may read; paths on its command line are not.
 */
export async function openInApp(
  app: InstalledApp,
  paths: [string, string],
  run = execFileAsync,
): Promise<void> {
  try {
    await run("/usr/bin/open", ["-a", app.path, ...paths], { timeout: 30_000 });
  } catch {
    throw new Error(
      "Diff Anything could not be opened. Open it once from Applications, then try again.",
    );
  }
}
const textPairAge = 24 * 60 * 60 * 1000;
/**
 * Writes two texts as files the app can open. They stay while the app may read them again and are
 * removed by a later text comparison once they are a day old.
 */
export async function writeTextPair(
  left: string,
  right: string,
  root: string,
  now = Date.now(),
): Promise<[string, string]> {
  const base = join(root, "text-comparisons");
  await mkdir(base, { recursive: true, mode: 0o700 });
  for (const entry of await readdir(base)) {
    const created = Number.parseInt(entry, 10);
    if (!Number.isFinite(created) || now - created > textPairAge)
      await rm(join(base, entry), { recursive: true, force: true });
  }
  const directory = join(
    base,
    `${now}-${Math.random().toString(36).slice(2, 8)}`,
  );
  await mkdir(directory, { mode: 0o700 });
  const paths: [string, string] = [
    join(directory, "Left text.txt"),
    join(directory, "Right text.txt"),
  ];
  await Promise.all(
    paths.map((path, i) =>
      writeFile(path, i ? right : left, { mode: 0o600, flag: "wx" }),
    ),
  );
  return paths;
}
