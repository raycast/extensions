// =============================================================================
// TEST SUPPORT - NATIVE BACKEND OVER THE COMPILED HELPER
// A SidecarBackend for hardware suites, driving the real Swift helper.
// -----------------------------------------------------------------------------
// Context: `src/lib/native.ts` imports `swift:../../swift`, which only Raycast's
//   build resolves — plain `tsc` cannot compile it, so the hardware suites cannot
//   import the shipped backend directly. They instead exec the binary that the
//   Swift package builds, which is the same code Raycast invokes and takes the
//   same protocol: `Sidecar <functionName> [jsonArg…]`, printing JSON to stdout.
// WARN: Requires `swift build` in swift/ first (see docs/WORKFLOWS.md). Without
//   it these suites cannot run, and that is deliberate — testing orchestration
//   against a backend the extension does not ship would prove the wrong thing.
// =============================================================================

import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

import type { SidecarBackend, SidecarDevice } from "../../src/lib/backend";

/** Where the Swift package put its executable, asked of SwiftPM directly. */
let cachedPath: string | undefined;

function helperPath(): string {
  if (cachedPath !== undefined) {
    return cachedPath;
  }
  const binDir = execFileSync("swift", ["build", "--show-bin-path"], {
    // The test build emits to .test-build/test/support, so the repo root is four
    // levels up; resolved from __dirname because this compiles to CommonJS.
    cwd: join(dirname(__dirname), "..", "..", "swift"),
    encoding: "utf8",
  }).trim();
  cachedPath = `${binDir}/Sidecar`;
  return cachedPath;
}

/**
 * Invokes one `@raycast` function and decodes its JSON result.
 *
 * @param fn   - The exported Swift function name.
 * @param args - Arguments, JSON-encoded one per parameter.
 * @returns The decoded result.
 */
function call<T>(fn: string, ...args: readonly unknown[]): T {
  const raw = execFileSync(helperPath(), [fn, ...args.map((a) => JSON.stringify(a))], { encoding: "utf8" }).trim();
  // Void-returning exports (connect, disconnect, extend, mirror) print nothing,
  // and JSON.parse("") throws — so an empty result is "no value", not an error.
  return (raw === "" ? undefined : JSON.parse(raw)) as T;
}

/**
 * The main display's CoreGraphics ID.
 *
 * @returns The CGDirectDisplayID of the current main display.
 *
 * NOTE: An oracle for the hardware suites — public CoreGraphics, read outside the
 *   orchestration under test.
 */
export function mainDisplayId(): number {
  return call<number>("mainDisplay");
}

/** The Sidecar display's presence and state, as the helper reports it. */
interface Status {
  readonly present: boolean;
  readonly main: boolean;
  readonly mirrored: boolean;
}

/**
 * Builds a SidecarBackend over the compiled Swift helper.
 *
 * @returns A backend equivalent to the shipped native engine.
 */
export function createHelperBackend(): SidecarBackend {
  return {
    listDevices(): Promise<readonly SidecarDevice[]> {
      const names = call<string[]>("listDevices");
      return Promise.resolve(names.map((name) => ({ name, uuid: name })));
    },
    isConnected(): Promise<boolean> {
      return Promise.resolve(call<Status>("status").present);
    },
    setConnected(ipadName: string, connected: boolean): Promise<void> {
      call<null>(connected ? "connect" : "disconnect", ipadName);
      return Promise.resolve();
    },
    readMirror(): Promise<boolean | null> {
      const status = call<Status>("status");
      return Promise.resolve(status.present ? status.mirrored : null);
    },
    isIpadMain(): Promise<boolean> {
      const status = call<Status>("status");
      return Promise.resolve(status.present && status.main);
    },
    extend(): Promise<void> {
      call<null>("extend");
      return Promise.resolve();
    },
    mirrorToMain(): Promise<void> {
      call<null>("mirror");
      return Promise.resolve();
    },
  };
}
