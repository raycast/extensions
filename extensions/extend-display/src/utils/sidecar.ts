import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * JXA bridge to the SidecarCore framework, used as a targeted fast path for
 * iPad/Sidecar targets.
 *
 * On macOS 26, selecting a Sidecar device through the System Settings
 * "Mirror or extend to" menu via Accessibility (AXPress) reports success but
 * does not start a session. SidecarDisplayManager uses the same Sidecar
 * subsystem exposed by System Settings, so it is used here for iPads while the
 * UI-scripting backend is kept for other targets.
 *
 * Note: SidecarCore is a private framework, so its API may change across macOS
 * releases; callers treat it as optional and fall back when it is unavailable.
 *
 * Reads SIDECAR_ACTION ("list" | "connect" | "disconnect" | "toggle") and
 * SIDECAR_DEVICE from the environment, prints a single JSON line to stdout.
 */
const SIDECAR_BRIDGE = `
function run() {
  ObjC.import('Foundation');

  function reply(o) { return JSON.stringify(o); }

  var env = $.NSProcessInfo.processInfo.environment;
  function envStr(key) {
    var v = env.objectForKey(key);
    return (v && !v.isNil()) ? ObjC.unwrap(v) : '';
  }

  var bundle = $.NSBundle.bundleWithPath('/System/Library/PrivateFrameworks/SidecarCore.framework');
  if (!bundle || bundle.isNil() || !bundle.load) {
    return reply({ ok: false, error: 'load-failed' });
  }

  var mgrClass = $.NSClassFromString('SidecarDisplayManager');
  if (!mgrClass || mgrClass.isNil()) {
    return reply({ ok: false, error: 'no-manager' });
  }
  var mgr = mgrClass.sharedManager;

  // normalize curly/straight apostrophes and case for name matching
  function norm(s) {
    return String(s).replace(/[\\u2018\\u2019\\u02BC\\u0060\\u00B4]/g, "'").trim().toLowerCase();
  }

  function deviceList(selector) {
    var arr = mgr[selector];
    var res = [];
    if (arr && !arr.isNil()) {
      for (var i = 0; i < arr.count; i++) {
        var d = arr.objectAtIndex(i);
        var n = d.name;
        res.push({ name: (n && !n.isNil()) ? ObjC.unwrap(n) : '', dev: d });
      }
    }
    return res;
  }

  function connectedNames() {
    return deviceList('connectedDevices').map(function (x) { return x.name; });
  }

  var action = envStr('SIDECAR_ACTION') || 'list';
  var devices = deviceList('devices');

  if (action === 'list') {
    return reply({
      ok: true,
      devices: devices.map(function (x) { return x.name; }),
      connected: connectedNames(),
    });
  }

  var wanted = norm(envStr('SIDECAR_DEVICE'));
  if (!wanted) return reply({ ok: false, error: 'no-device-name' });

  var target = null;
  for (var i = 0; i < devices.length; i++) {
    if (norm(devices[i].name) === wanted) { target = devices[i]; break; }
  }
  if (!target) {
    for (var j = 0; j < devices.length; j++) {
      if (norm(devices[j].name).indexOf(wanted) !== -1) { target = devices[j]; break; }
    }
  }
  if (!target) {
    return reply({
      ok: false,
      error: 'device-not-found',
      devices: devices.map(function (x) { return x.name; }),
    });
  }

  function targetConnected() {
    var t = norm(target.name);
    return connectedNames().some(function (n) { return norm(n) === t; });
  }

  var shouldConnect = action === 'connect' ? true
    : action === 'disconnect' ? false
    : !targetConnected();

  // SidecarCore completion blocks are not delivered back to JXA, so we pass an
  // empty block and poll connectedDevices to learn the real outcome.
  if (shouldConnect) {
    mgr.connectToDeviceCompletion(target.dev, function () {});
  } else {
    mgr.disconnectFromDeviceCompletion(target.dev, function () {});
  }

  var deadline = $.NSDate.dateWithTimeIntervalSinceNow(13);
  while ($.NSDate.date.compare(deadline) < 0) {
    $.NSRunLoop.currentRunLoop.runModeBeforeDate(
      $.NSDefaultRunLoopMode,
      $.NSDate.dateWithTimeIntervalSinceNow(0.25),
    );
    if (targetConnected() === shouldConnect) break;
  }

  var finalConnected = targetConnected();
  return reply({
    ok: finalConnected === shouldConnect,
    connected: finalConnected,
    requested: shouldConnect ? 'connect' : 'disconnect',
    target: target.name,
  });
}
`;

/**
 * Normalize a device name for matching: unify curly/straight apostrophes,
 * trim, and lowercase. Mirrors the `norm()` used inside the JXA bridge.
 */
export function normalizeName(name: string): string {
  return name
    .replace(/[‘’ʼ`´]/g, "'")
    .trim()
    .toLowerCase();
}

export type SidecarAction = "list" | "connect" | "disconnect" | "toggle";

interface SidecarReply {
  ok: boolean;
  error?: string;
  devices?: string[];
  connected?: boolean | string[];
  requested?: string;
  target?: string;
}

async function runBridge(
  action: SidecarAction,
  deviceName?: string,
): Promise<SidecarReply> {
  const { stdout } = await execFileAsync(
    "osascript",
    ["-l", "JavaScript", "-e", SIDECAR_BRIDGE],
    {
      timeout: 20000,
      env: {
        ...process.env,
        SIDECAR_ACTION: action,
        SIDECAR_DEVICE: deviceName ?? "",
      },
    },
  );

  const text = stdout.trim();
  if (!text) {
    throw new Error("Sidecar bridge returned no output");
  }
  return JSON.parse(text) as SidecarReply;
}

/**
 * List Sidecar-capable devices (iPads) known to SidecarCore, plus the names of
 * those currently connected.
 *
 * Never throws: if SidecarCore is unavailable (framework missing, future macOS
 * change, osascript failure) it returns empty lists so callers can fall back
 * to the System Settings backend.
 */
export async function listSidecarDevices(): Promise<{
  devices: string[];
  connected: string[];
}> {
  try {
    const reply = await runBridge("list");
    if (!reply.ok) {
      console.error(
        `SidecarCore unavailable: ${reply.error ?? "unknown error"}`,
      );
      return { devices: [], connected: [] };
    }
    return {
      devices: reply.devices ?? [],
      connected: Array.isArray(reply.connected) ? reply.connected : [],
    };
  } catch (e) {
    console.error("SidecarCore list failed:", e);
    return { devices: [], connected: [] };
  }
}

/**
 * Connect, disconnect, or toggle a Sidecar device by name. Curly and straight
 * apostrophes are treated as equal.
 */
export async function setSidecarConnection(
  deviceName: string,
  action: "connect" | "disconnect" | "toggle",
): Promise<{ connected: boolean; target: string }> {
  const reply = await runBridge(action, deviceName);
  if (!reply.ok) {
    if (reply.error === "device-not-found") {
      throw new Error(
        `"${deviceName}" not found. Make sure the iPad is nearby, unlocked, and signed in to the same Apple Account.`,
      );
    }
    throw new Error(
      `Sidecar ${action} failed: ${reply.error ?? "unknown error"}`,
    );
  }
  return {
    connected: reply.connected === true,
    target: reply.target ?? deviceName,
  };
}
