import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lightweight package.json port detection, mirrored from Core DevServerDetector.
 */
export function detectDevServerUrl(directory: string): string | null {
  const trimmed = directory.trim();
  if (!trimmed) {
    return null;
  }

  const packageJsonPath = join(trimmed, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const raw = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, unknown>;
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
      peerDependencies?: Record<string, unknown>;
    };

    const script = readScript(raw.scripts, "dev") ?? readScript(raw.scripts, "start");
    if (script) {
      const portFromScript = tryExtractPort(script);
      if (portFromScript !== null) {
        return toLocalhostUrl(portFromScript);
      }
    }

    const port = inferDefaultPort(raw, script);
    return port === null ? null : toLocalhostUrl(port);
  } catch {
    return null;
  }
}

function readScript(scripts: Record<string, unknown> | undefined, name: string): string | null {
  const value = scripts?.[name];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function tryExtractPort(script: string): number | null {
  const explicit = script.match(/(?:--port|-p|=)\s*(\d{2,5})/i);
  if (explicit?.[1]) {
    return Number.parseInt(explicit[1], 10);
  }

  const localhost = script.match(/localhost:(\d{2,5})/i);
  if (localhost?.[1]) {
    return Number.parseInt(localhost[1], 10);
  }

  return null;
}

function inferDefaultPort(
  packageJson: {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
    peerDependencies?: Record<string, unknown>;
  },
  script: string | null,
): number | null {
  if (script) {
    if (/vite/i.test(script)) {
      return 5173;
    }
    if (/next|react-scripts|nuxt/i.test(script)) {
      return 3000;
    }
  }

  if (hasDependency(packageJson, "vite")) {
    return 5173;
  }
  if (hasDependency(packageJson, "next") || hasDependency(packageJson, "react-scripts")) {
    return 3000;
  }

  return script ? 3000 : null;
}

function hasDependency(
  packageJson: {
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
    peerDependencies?: Record<string, unknown>;
  },
  packageName: string,
): boolean {
  return Boolean(
    packageJson.dependencies?.[packageName] ||
    packageJson.devDependencies?.[packageName] ||
    packageJson.peerDependencies?.[packageName],
  );
}

function toLocalhostUrl(port: number): string {
  return `http://localhost:${port}`;
}
