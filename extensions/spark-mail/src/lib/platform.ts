import { win32 } from "node:path";

/**
 * Where to look for the Spark CLI on a given platform. Pure so it can be unit
 * tested without touching the real filesystem or environment. Windows dirs are
 * joined with `path.win32` so the result is Windows-shaped even when the test
 * suite runs on macOS.
 */
export function sparkSearch(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): { bin: string; dirs: string[]; findCmd: string } {
  if (platform === "win32") {
    return {
      bin: "spark.exe",
      dirs: [
        win32.join(
          env.LOCALAPPDATA ?? "",
          "Programs",
          "SparkDesktop",
          "resources",
          "app.asar.unpacked",
          "node_modules",
          "@readdle",
          "sparkcore-win",
          "bin",
          "Release",
          "SparkCore.bundle",
        ),
      ],
      findCmd: "where.exe spark",
    };
  }
  return {
    bin: "spark",
    dirs: ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"],
    findCmd: "which spark",
  };
}
