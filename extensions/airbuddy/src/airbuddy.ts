import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type {
  AppState,
  BatteryAlertKind,
  BatteryPosition,
  Device,
  DeviceAction,
  DeviceKind,
  ListeningMode,
} from "./types";

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 10_000;

export class ScriptingDisabledError extends Error {
  constructor() {
    super("AirBuddy's AppleScript support is turned off.");
    this.name = "ScriptingDisabledError";
  }
}

export class AutomationConsentError extends Error {
  constructor() {
    super("macOS has not granted Raycast permission to control AirBuddy.");
    this.name = "AutomationConsentError";
  }
}

export class AirBuddyNotRunningError extends Error {
  constructor() {
    super("AirBuddy isn't running.");
    this.name = "AirBuddyNotRunningError";
  }
}

export class AirBuddyNotInstalledError extends Error {
  constructor() {
    super("AirBuddy isn't installed.");
    this.name = "AirBuddyNotInstalledError";
  }
}

export class AirBuddyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AirBuddyError";
  }
}

/**
 * -1743 is errAEEventNotPermitted — a GENERIC "Apple Event not permitted" code. It does NOT
 * uniquely mean "AirBuddy scripting is off". It also fires when macOS Automation consent is
 * denied, which is a different setting in a different app. Classify on the MESSAGE, not the code.
 *
 * AirBuddy authors a descriptive message ("...you must enable scripting in AirBuddy Settings").
 * The OS, refusing before AirBuddy ever sees the event, does not.
 *
 * VERIFY THE EXACT STRINGS on a machine where consent is denied (see Task 12) before trusting this.
 */
export function classifyError(stderr: string): Error {
  const text = stderr.toLowerCase();

  if (text.includes("enable scripting in airbuddy") || text.includes("airbuddy settings")) {
    return new ScriptingDisabledError();
  }
  if (text.includes("-1743") || text.includes("not permitted") || text.includes("not authorized")) {
    return new AutomationConsentError();
  }
  // -2700 ("Application can't be found") is what macOS ACTUALLY returns when AirBuddyHelper can't be
  // reached — verified. Without this branch it fell through to the generic error below, so a user
  // whose helper wasn't running got "Something Went Wrong" instead of the launch-and-retry view.
  // Note the apostrophe here is U+2019, which is what osascript emits — match both forms.
  if (
    text.includes("-2700") ||
    text.includes("-600") ||
    text.includes("application isn't running") ||
    text.includes("application isn’t running") ||
    text.includes("application can't be found") ||
    text.includes("application can’t be found")
  ) {
    return new AirBuddyNotRunningError();
  }
  if (text.includes("-1728") || text.includes("can't get application") || text.includes("can’t get application")) {
    return new AirBuddyNotInstalledError();
  }
  return new AirBuddyError(stderr.trim() || "Unknown AirBuddy error");
}

/**
 * Runs a JXA script against AirBuddyHelper and parses its JSON stdout.
 *
 * SECURITY: `script` MUST be a static string literal. Values are passed via `args` and read
 * inside the script from the `argv` parameter of `run()`. NEVER interpolate a device name or id
 * into the script source — a device named `"); doSomething((` would otherwise execute.
 */
export async function runJXA<T>(script: string, args: string[] = [], signal?: AbortSignal): Promise<T> {
  try {
    // "--" terminates option parsing: without it, a value beginning with "-" would be read as an
    // osascript flag ("illegal option -- x"). Every value we pass today is a UUID or an enum, but
    // device names are user-editable and this is a one-token guarantee.
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script, "--", ...args], {
      timeout: TIMEOUT_MS,
      killSignal: "SIGKILL",
      // Without this, navigating away from the list leaves the osascript child running to
      // completion (up to TIMEOUT_MS). execFile kills the process when the signal aborts.
      signal,
    });

    const trimmed = stdout.trim();
    if (trimmed === "") {
      return undefined as T;
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      throw new AirBuddyError(`AirBuddy returned unparseable output: ${trimmed.slice(0, 200)}`);
    }
  } catch (error) {
    if (error instanceof AirBuddyError) throw error;

    // An aborted fetch is not a failure — the user navigated away. Rethrow it as-is so
    // callers can ignore it, rather than classifying it as a real AirBuddy error and
    // showing the user a red toast for something they caused on purpose.
    if (error instanceof Error && error.name === "AbortError") throw error;

    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : error instanceof Error
          ? error.message
          : String(error);

    throw classifyError(stderr);
  }
}

const GET_DEVICES = `
function run() {
  const app = Application("AirBuddyHelper");
  const out = [];
  for (const d of app.devices()) {
    const rec = {
      id: d.id(), name: d.name(), kind: d.kind(), model: d.model(), brand: d.brand(),
      address: d.address(), connected: d.connected(), nearby: d.nearby(),
      distance: d.distance(), source: d.source(), audioState: d.audioState(),
      inputRoute: d.inputRoute(), outputRoute: d.outputRoute(),
      listeningMode: d.listeningMode(),
      supportedListeningModes: d.supportedListeningModes(),
      pinned: d.pinned(), favorite: d.favorite(),
      supportedActions: d.supportedActions(),
      leftBudInEar: d.leftBudInEar(), rightBudInEar: d.rightBudInEar(),
      anyBudInEar: d.anyBudInEar(), anyBudInCase: d.anyBudInCase(),
      caseLidClosed: d.caseLidClosed(),
      batteries: d.batteries().map(function (b) {
        return {
          position: b.position(), level: b.level(), chargingState: b.chargingState(),
          low: b.low(), unreliable: b.unreliable()
        };
      }),
      alerts: d.batteryAlerts().map(function (a) {
        return {
          kind: a.kind(), position: a.position(),
          threshold: a.threshold(), enabled: a.enabled()
        };
      })
    };
    out.push(rec);
  }
  return JSON.stringify(out);
}
`;

export async function getDevices(signal?: AbortSignal): Promise<Device[]> {
  return runJXA<Device[]>(GET_DEVICES, [], signal);
}

/**
 * `pinned`/`favorite` are settable properties in AirBuddy 911 (sdef `access="rw"`), not commands.
 * Direct property assignment (`d.pinned = value`) is the correct JXA idiom — live-verified to
 * round-trip correctly (set true, read back true, restore original, read back original).
 */
const SET_PINNED = `
function run(argv) {
  const app = Application("AirBuddyHelper");
  for (const d of app.devices()) {
    if (d.id() === argv[0]) { d.pinned = (argv[1] === "true"); return ""; }
  }
  return "";
}
`;

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  await runJXA<void>(SET_PINNED, [id, String(pinned)]);
}

/** AirBuddy's sdef: "setting true replaces the previous favorite" — there is only ever one. */
const SET_FAVORITE = `
function run(argv) {
  const app = Application("AirBuddyHelper");
  for (const d of app.devices()) {
    if (d.id() === argv[0]) { d.favorite = (argv[1] === "true"); return ""; }
  }
  return "";
}
`;

export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  await runJXA<void>(SET_FAVORITE, [id, String(favorite)]);
}

const GET_APP_STATE = `
function run() {
  const app = Application("AirBuddyHelper");
  function nameOf(fn) {
    try { const d = fn(); return d ? d.name() : null; } catch (e) { return null; }
  }
  return JSON.stringify({
    spatialAudioMode: app.spatialAudioMode(),
    currentOutputName: nameOf(function () { return app.currentOutputDevice(); }),
    currentInputName: nameOf(function () { return app.currentInputDevice(); }),
    nearestHeadsetName: nameOf(function () { return app.nearestHeadset(); }),
    favoriteHeadsetName: nameOf(function () { return app.favoriteHeadset(); })
  });
}
`;

export async function getAppState(): Promise<AppState> {
  return runJXA<AppState>(GET_APP_STATE);
}

/**
 * argv[2] is a TRISTATE: "" (don't send the param at all), "true", or "false".
 *
 * An earlier version sent `String(opts.microphoneEnabled ?? false)` and only set the option when the
 * string was "true" — so a caller explicitly asking for `microphoneEnabled: false` was silently
 * indistinguishable from not asking at all, and the parameter was never sent. The sdef declares it as
 * an optional boolean, so `false` is a meaningful request ("connect, but don't enable the mic").
 */
const CONNECT_DEVICE = `
function run(argv) {
  const app = Application("AirBuddyHelper");
  const opts = {};
  if (argv[1]) opts.listeningMode = argv[1];
  if (argv[2] === "true") opts.microphoneEnabled = true;
  else if (argv[2] === "false") opts.microphoneEnabled = false;
  app.connectDevice(argv[0], opts);
  return "";
}
`;

export async function connectDevice(
  id: string,
  opts: { listeningMode?: ListeningMode; microphoneEnabled?: boolean } = {},
): Promise<void> {
  // "" means "don't send the parameter" — distinct from an explicit false.
  const mic = opts.microphoneEnabled === undefined ? "" : String(opts.microphoneEnabled);
  await runJXA<void>(CONNECT_DEVICE, [id, opts.listeningMode ?? "", mic]);
}

const DISCONNECT_DEVICE = `
function run(argv) {
  Application("AirBuddyHelper").disconnectDevice(argv[0]);
  return "";
}
`;

export async function disconnectDevice(id: string): Promise<void> {
  await runJXA<void>(DISCONNECT_DEVICE, [id]);
}

const CONNECT_NEAREST = `function run() { Application("AirBuddyHelper").connectToNearestHeadset(); return ""; }`;
export async function connectNearest(): Promise<void> {
  await runJXA<void>(CONNECT_NEAREST);
}

const CONNECT_FAVORITE = `function run() { Application("AirBuddyHelper").connectToFavoriteHeadset(); return ""; }`;
export async function connectFavorite(): Promise<void> {
  await runJXA<void>(CONNECT_FAVORITE);
}

/**
 * `connected` is essential, not decorative: the favorite headset is frequently ABSENT from the
 * `devices` collection (verified — AirPods in their case still resolve as the favorite, with
 * `inDevicesList: false`). So a connect must be polled on THIS handle, not by searching
 * `getDevices()` for the favorite's id, which may never appear there.
 */
const GET_FAVORITE = `
function run() {
  const app = Application("AirBuddyHelper");
  const f = app.favoriteHeadset();
  if (!f) return JSON.stringify(null);
  return JSON.stringify({ id: f.id(), name: f.name(), connected: f.connected() });
}
`;

export interface HeadsetHandle {
  id: string;
  name: string;
  connected: boolean;
}

/** @deprecated name kept for compatibility — use HeadsetHandle. */
export type FavoriteHeadset = HeadsetHandle;

export async function getFavoriteHeadset(): Promise<HeadsetHandle | null> {
  return runJXA<HeadsetHandle | null>(GET_FAVORITE);
}

/**
 * Same wall as the favorite: `nearest headset` resolves devices that are NOT in `devices()`.
 * Polling `getDevices()` for the nearest headset's id can therefore spin until timeout on a connect
 * that actually succeeded. Poll THIS handle instead.
 *
 * Also note names are not unique — AirBuddy's own binary carries the error string
 * `More than one device matches "` — so a poll must match on `id`, never on `name`.
 */
const GET_NEAREST = `
function run() {
  const app = Application("AirBuddyHelper");
  const h = app.nearestHeadset();
  if (!h) return JSON.stringify(null);
  return JSON.stringify({ id: h.id(), name: h.name(), connected: h.connected() });
}
`;

export async function getNearestHeadset(): Promise<HeadsetHandle | null> {
  return runJXA<HeadsetHandle | null>(GET_NEAREST);
}

/**
 * The device currently serving as the audio OUTPUT route, with its id.
 *
 * This exists because `AppState` carries only a *name*, which forced the listening-mode and
 * disconnect commands to guess their target by scanning `devices()` for "the first connected,
 * mode-capable headset". That guess is wrong whenever two headsets are connected: `devices()` has no
 * documented ordering, and AirBuddy picks its own target for the bare `toggle listening mode` /
 * `disconnect headset` commands. The result is that the mode flips on one headset while we poll the
 * other, and time out reporting failure for a command that worked.
 *
 * The output route is the honest answer to "which headset does the user mean?" — it is the one
 * they're listening to.
 */
const GET_OUTPUT_DEVICE = `
function run() {
  const app = Application("AirBuddyHelper");
  var d = null;
  try { d = app.currentOutputDevice(); } catch (e) { d = null; }
  if (!d) return JSON.stringify(null);
  return JSON.stringify({
    id: d.id(),
    name: d.name(),
    kind: d.kind(),
    connected: d.connected(),
    listeningMode: d.listeningMode(),
    supportedListeningModes: d.supportedListeningModes(),
    supportedActions: d.supportedActions()
  });
}
`;

export interface OutputDevice {
  id: string;
  name: string;
  // The current output route is any `device` — including THIS MAC when its built-in speakers are
  // the active route. Without `kind`, disconnect-headset.ts treated any non-null output as a
  // disconnectable headset, so it could call `disconnect device` on the user's own Mac and report
  // "Disconnected <Mac name>" for a command literally named "Disconnect Headset". Callers MUST
  // check `kind === "headset"` before treating this as a headset target — or, more precisely now,
  // check `supportedActions.includes("disconnect")`.
  kind: DeviceKind;
  connected: boolean;
  listeningMode: ListeningMode | null;
  supportedListeningModes: ListeningMode[];
  supportedActions: DeviceAction[];
}

export async function getOutputDevice(): Promise<OutputDevice | null> {
  return runJXA<OutputDevice | null>(GET_OUTPUT_DEVICE);
}

const DISCONNECT_HEADSET = `function run() { Application("AirBuddyHelper").disconnectHeadset(); return ""; }`;
export async function disconnectHeadset(): Promise<void> {
  await runJXA<void>(DISCONNECT_HEADSET);
}

const SET_LISTENING_MODE = `
function run(argv) {
  const app = Application("AirBuddyHelper");
  if (argv[1]) {
    app.setListeningMode(argv[0], { device: argv[1] });
  } else {
    app.setListeningMode(argv[0]);
  }
  return "";
}
`;

export async function setListeningMode(mode: ListeningMode, deviceId?: string): Promise<void> {
  await runJXA<void>(SET_LISTENING_MODE, [mode, deviceId ?? ""]);
}

/**
 * The sdef declares `toggle listening mode` with an OPTIONAL direct parameter (device | text).
 * Pass the device id whenever we know it: called bare, AirBuddy picks its own target, and with
 * two headsets connected that can differ from the one the caller selected — so the caller polls
 * a device that never changes while the mode flips on the other one.
 */
const TOGGLE_LISTENING_MODE = `
function run(argv) {
  const app = Application("AirBuddyHelper");
  if (argv[0]) { app.toggleListeningMode(argv[0]); } else { app.toggleListeningMode(); }
  return "";
}
`;

export async function toggleListeningMode(deviceId?: string): Promise<void> {
  await runJXA<void>(TOGGLE_LISTENING_MODE, [deviceId ?? ""]);
}

/**
 * The sdef's optional direct-parameter is "the target output device". Pass the id whenever we know
 * it: called bare, the command acts on whatever currently owns the output route — so a UI that
 * offers this per-device would toggle one headset while the toast names another.
 */
const TOGGLE_SPATIAL_AUDIO = `
function run(argv) {
  const app = Application("AirBuddyHelper");
  if (argv[0]) { app.toggleSpatialAudioMode(argv[0]); } else { app.toggleSpatialAudioMode(); }
  return "";
}
`;

export async function toggleSpatialAudio(deviceId?: string): Promise<void> {
  await runJXA<void>(TOGGLE_SPATIAL_AUDIO, [deviceId ?? ""]);
}

const SHOW_STATUS_WINDOW = `function run(argv) { Application("AirBuddyHelper").showStatusWindow(argv[0]); return ""; }`;
export async function showStatusWindow(id: string): Promise<void> {
  await runJXA<void>(SHOW_STATUS_WINDOW, [id]);
}

const SHOW_DEVICE_MENU = `function run(argv) { Application("AirBuddyHelper").showDeviceMenu(argv[0]); return ""; }`;
export async function showDeviceMenu(id: string): Promise<void> {
  await runJXA<void>(SHOW_DEVICE_MENU, [id]);
}

const SHOW_DASHBOARD = `function run() { Application("AirBuddyHelper").showDashboard(); return ""; }`;
export async function showDashboard(): Promise<void> {
  await runJXA<void>(SHOW_DASHBOARD);
}

const SET_LOW_ALERT = `
function run(argv) {
  Application("AirBuddyHelper").setLowBatteryAlert(argv[0], {
    threshold: parseFloat(argv[1]), part: argv[2], enabled: argv[3] === "true"
  });
  return "";
}
`;

const SET_CHARGED_ALERT = `
function run(argv) {
  Application("AirBuddyHelper").setChargedBatteryAlert(argv[0], {
    threshold: parseFloat(argv[1]), part: argv[2], enabled: argv[3] === "true"
  });
  return "";
}
`;

export async function setBatteryAlert(
  deviceId: string,
  kind: BatteryAlertKind,
  position: BatteryPosition,
  threshold: number,
  enabled: boolean,
): Promise<void> {
  const script = kind === "low battery" ? SET_LOW_ALERT : SET_CHARGED_ALERT;
  await runJXA<void>(script, [deviceId, String(threshold), position, String(enabled)]);
}

/**
 * NOT WIRED TO ANY UI IN V1. Deleting removes the only editable alert records, and whether
 * AirBuddy re-seeds them is unverified — the user could delete their way into an empty form
 * with no recovery path. Kept for future use. See spec, "Battery alert form".
 */
const DELETE_ALERTS = `function run(argv) { Application("AirBuddyHelper").deleteBatteryAlerts(argv[0]); return ""; }`;
export async function deleteBatteryAlerts(id: string): Promise<void> {
  await runJXA<void>(DELETE_ALERTS, [id]);
}
