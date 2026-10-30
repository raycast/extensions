import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { GlazeApp } from "./types";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

async function entries(directory: string) {
  try {
    return await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function readApp(
  manifestDir: string,
  appPath: string,
  local: boolean,
): Promise<GlazeApp | null> {
  try {
    const pkg = JSON.parse(
      await fs.readFile(path.join(manifestDir, "package.json"), "utf8"),
    );
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) return null;
    const glaze = record(pkg.glaze);
    const config = record(pkg.appConfig);
    const name = text(pkg.name);
    const appId = text(glaze.appId);
    const projectId = text(glaze.projectId) || text(pkg.id);
    if (!name || (!appId && !projectId)) return null;
    // A bundled manifest cannot turn a store install into an editable project.
    // Local bundles are identified by their link back to project sources.
    const variant = local
      ? "local"
      : glaze.variant === "preview"
        ? "preview"
        : "store";
    const id =
      appId ||
      (typeof pkg.id === "string" && pkg.id.startsWith(`${pkg.name}-`)
        ? pkg.id
        : `${name}-${variant}-${projectId}`);
    const stats = await fs.stat(appPath);
    return {
      id,
      name,
      variant,
      displayName:
        text(glaze.displayName) ||
        text(config.displayName) ||
        text(pkg.productName) ||
        name,
      description:
        text(glaze.description) ||
        text(config.description) ||
        text(pkg.description),
      version: text(pkg.version) || "1.0.0",
      storeAppId: text(pkg.storeAppId),
      author: text(pkg.author) || text(record(pkg.author).name),
      path: appPath,
      runtimePath: manifestDir,
      createdAt: stats.birthtimeMs,
      sdkVersion: text(glaze.sdkVersion),
    };
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      ["ENOENT", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      return null;
    throw error;
  }
}

export async function discoverApps(
  projectRoots: string[],
  bundleRoots: string[],
): Promise<GlazeApp[]> {
  const apps = new Map<string, GlazeApp>();
  for (const root of projectRoots) {
    for (const entry of await entries(root)) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const projectPath = path.join(root, entry.name);
      let app: GlazeApp | null = null;
      // Sources contain the latest metadata, including projects not built yet.
      for (const folder of ["sources", ".glaze-sources", "runtime", ".glaze"]) {
        app = await readApp(path.join(projectPath, folder), projectPath, true);
        if (app) break;
      }
      if (!app || apps.has(app.id)) continue;
      for (const folder of ["sources", ".glaze-sources"]) {
        try {
          await fs.access(path.join(projectPath, folder, "package.json"));
          app.sourcesPath = path.join(projectPath, folder);
          break;
        } catch {
          /* Try the legacy layout. */
        }
      }
      app.runtimePath = app.sourcesPath || app.runtimePath;
      apps.set(app.id, app);
    }
  }
  for (const root of bundleRoots) {
    for (const entry of await entries(root)) {
      if (
        (!entry.isDirectory() && !entry.isSymbolicLink()) ||
        !entry.name.endsWith(".app")
      )
        continue;
      const bundlePath = path.join(root, entry.name);
      const runtimeLink = path.join(
        bundlePath,
        "Contents/Resources/glaze-runtime",
      );
      let runtimePath: string;
      let local: boolean;
      try {
        local = (await fs.lstat(runtimeLink)).isSymbolicLink();
        runtimePath = await fs.realpath(runtimeLink);
      } catch {
        continue;
      }
      const app = await readApp(runtimePath, bundlePath, local);
      if (!app) continue;
      const existing =
        apps.get(app.id) ||
        [...apps.values()].find(
          (candidate) => local && path.dirname(runtimePath) === candidate.path,
        );
      if (existing) {
        existing.bundlePath = bundlePath;
        continue;
      }
      // Orphaned local bundles can still be launched; never treat them as store installs.
      app.bundlePath = bundlePath;
      apps.set(app.id, app);
    }
  }
  return [...apps.values()].sort((a, b) => b.createdAt - a.createdAt);
}
