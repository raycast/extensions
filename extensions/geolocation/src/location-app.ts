import { environment } from "@raycast/api";
import { Effect, Schema } from "effect";
import { execFile } from "node:child_process";
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
// Makes Raycast compile the Swift package into assets/compiled_raycast_swift.
import "swift:../swift";

/**
 * macOS only shows the location prompt to an app bundle with a usage description; the Swift binary
 * that Raycast runs directly gets neither a prompt nor a fix. So the binary is copied into
 * "Raycast Geolocation.app" in the extension's support folder, signed ad hoc and launched with `open`.
 *
 * The ad hoc signature ties the location permission to the exact binary, so the bundle is only rebuilt
 * when {@link APP_VERSION} changes: bump it when the Swift code or the Info.plist changes.
 */
const APP_VERSION = 2;

const APP_NAME = "Raycast Geolocation.app";
const EXECUTABLE = "RaycastGeolocation";
const USAGE = "The Geolocation extension for Raycast copies your current location to the clipboard.";
const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.y87cgp.raycast-geolocation.helper</string>
  <key>CFBundleName</key>
  <string>Raycast Geolocation</string>
  <key>CFBundleDisplayName</key>
  <string>Raycast Geolocation</string>
  <key>CFBundleExecutable</key>
  <string>${EXECUTABLE}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${APP_VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${APP_VERSION}</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSLocationUsageDescription</key>
  <string>${USAGE}</string>
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>${USAGE}</string>
</dict>
</plist>
`;

/** The Swift side waits up to 60 s, leaving time for the first-time permission prompt. */
const RUN_TIMEOUT_MS = 75_000;

export class LocationAppError extends Schema.TaggedError<LocationAppError>()("LocationAppError", {
  /** The last line the Swift function printed to stderr: its thrown error. */
  output: Schema.String,
  cause: Schema.Defect(),
}) {}

const attempt = <A>(try_: () => Promise<A>) =>
  Effect.tryPromise({ try: try_, catch: (cause) => new LocationAppError({ output: "", cause }) });

const execFileAsync = promisify(execFile);
const readOrEmpty = (path: string) => attempt(() => readFile(path, "utf8").catch(() => ""));

const appPath = join(environment.supportPath, APP_NAME);
const stampPath = join(environment.supportPath, "location-app-version");

const ensureApp = Effect.gen(function* () {
  const stamp = `${APP_NAME} v${APP_VERSION}`;
  const macOS = join(appPath, "Contents", "MacOS");
  const executable = join(macOS, EXECUTABLE);
  const exists = yield* attempt(() =>
    access(executable).then(
      () => true,
      () => false,
    ),
  );
  if (exists && (yield* readOrEmpty(stampPath)) === stamp) return appPath;

  yield* attempt(async () => {
    await rm(appPath, { recursive: true, force: true });
    await mkdir(macOS, { recursive: true });
    await copyFile(join(environment.assetsPath, "compiled_raycast_swift", "swift"), executable);
    await chmod(executable, 0o755);
    await writeFile(join(appPath, "Contents", "Info.plist"), INFO_PLIST);
    await execFileAsync("/usr/bin/codesign", ["--force", "--sign", "-", appPath]);
    // Written last, so an interrupted build is redone on the next run.
    await writeFile(stampPath, stamp);
  });
  return appPath;
}).pipe(Effect.withSpan("LocationApp.ensure"));

/** Runs an `@raycast` Swift function inside the location app and returns its JSON output. */
export const runInLocationApp = Effect.fn("runInLocationApp")(function* (fn: string) {
  const app = yield* ensureApp;
  const dir = yield* Effect.acquireRelease(
    attempt(() => mkdtemp(join(tmpdir(), "raycast-geolocation-"))),
    (dir) => Effect.promise(() => rm(dir, { recursive: true, force: true })),
  );
  const stdout = join(dir, "stdout");
  const stderr = join(dir, "stderr");

  // `open -W` exits with an error when the app quits before it starts waiting, for example when Core
  // Location answers from its cache. The app's output decides the result, so that error only matters
  // when the app wrote nothing.
  const launch = yield* attempt(() =>
    execFileAsync(
      "/usr/bin/open",
      ["-W", "-n", "-g", "--stdout", stdout, "--stderr", stderr, "-a", app, "--args", fn],
      { timeout: RUN_TIMEOUT_MS },
    ).then(
      () => undefined,
      (error: unknown) => error,
    ),
  );

  const output = (yield* readOrEmpty(stdout)).trim();
  if (output) return output;
  // Core Location may log to stderr before the Swift error, so only the last line is the error itself.
  const error = (yield* readOrEmpty(stderr)).trim().split("\n").at(-1) ?? "";
  return yield* new LocationAppError({
    output: error,
    cause: error ? new Error(error) : (launch ?? new Error("No output")),
  });
}, Effect.scoped);
