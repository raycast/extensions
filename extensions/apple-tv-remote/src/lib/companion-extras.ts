/**
 * Companion-protocol features that @bharper/atv-js doesn't expose yet:
 * app launching, installed-app listing, and sleep/wake. Payloads are ported
 * from pyatv's reference implementation (pyatv/protocols/companion/api.py)
 * and sent over the library's public `CompanionProtocol.sendCommand`, which
 * handles request/response correlation on the encrypted session.
 *
 * Worth upstreaming to https://github.com/bsharper/atvjs.
 */
import { AppleTVConnection, HidCommand, RemoteKey, sendKeyDown, sendKeyUp, sendKey } from "@bharper/atv-js";

/** pyatv `is_url_or_scheme`: URLs and custom schemes deep-link, bundle IDs launch. */
function isUrlOrScheme(value: string): boolean {
  return value.includes("://");
}

/**
 * Launch an app by bundle ID (e.g. `com.netflix.Netflix`) or deep-link a URL
 * (e.g. `https://www.netflix.com/title/80234304`).
 */
export async function launchApp(conn: AppleTVConnection, bundleIdOrUrl: string): Promise<void> {
  const key = isUrlOrScheme(bundleIdOrUrl) ? "_urlS" : "_bundleID";
  await conn.protocol.sendCommand("_launchApp", { [key]: bundleIdOrUrl });
}

/** Installed apps as a map of bundle ID → display name. */
export async function listApps(conn: AppleTVConnection): Promise<Record<string, string>> {
  const response = await conn.protocol.sendCommand("FetchLaunchableApplicationsEvent", {});
  return (response._c ?? {}) as Record<string, string>;
}

/**
 * Fire a HID command as a full button press. pyatv's sleep example sends only
 * the button-up event, but its HID helper presses down+up like a real button,
 * so we match the helper.
 */
async function pressHid(conn: AppleTVConnection, command: HidCommand): Promise<void> {
  await conn.protocol.sendCommand("_hidC", { _hBtS: 1, _hidC: command });
  await conn.protocol.sendCommand("_hidC", { _hBtS: 2, _hidC: command });
}

export async function sleepDevice(conn: AppleTVConnection): Promise<void> {
  await pressHid(conn, HidCommand.Sleep);
}

export async function wakeDevice(conn: AppleTVConnection): Promise<void> {
  await pressHid(conn, HidCommand.Wake);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Long-press a key (button down → 1s → up). tvOS distinguishes tap from hold
 * at the ~1s boundary. This is how context menus open (long-press select)
 * and how pyatv implements every "hold" action.
 */
export async function longPress(conn: AppleTVConnection, key: RemoteKey, holdMs = 1000): Promise<void> {
  await sendKeyDown(conn.protocol, key);
  await delay(holdMs);
  await sendKeyUp(conn.protocol, key);
}

/** Open the context menu for the focused item (physical remote: hold the clickpad). */
export async function longPressSelect(conn: AppleTVConnection): Promise<void> {
  await longPress(conn, RemoteKey.Select);
}

/** App switcher (physical remote: double-press the TV button). */
export async function appSwitcher(conn: AppleTVConnection): Promise<void> {
  await sendKey(conn, RemoteKey.Home);
  await delay(150);
  await sendKey(conn, RemoteKey.Home);
}

/**
 * Open Control Center. Counter-intuitively this is NOT a Home-hold over the
 * protocol, pyatv sends a single HID PageDown (19).
 */
export async function controlCenter(conn: AppleTVConnection): Promise<void> {
  await pressHid(conn, HidCommand.PageDown);
}

/** Start the screensaver. Known-flaky upstream (pyatv #2139), callers should tolerate failure. */
export async function startScreensaver(conn: AppleTVConnection): Promise<void> {
  await pressHid(conn, HidCommand.Screensaver);
}

/**
 * Skip within the current media by N seconds (negative = backward) via the
 * MediaControl channel, the seconds-based path pyatv uses; the library's
 * key-press mapping for the skip keys is incomplete upstream.
 */
export async function skipBy(conn: AppleTVConnection, seconds: number): Promise<void> {
  // The library's OPACK integer packer rejects negative integers, and pyatv
  // sends _skpS as a float anyway, nudging the value off the integer grid
  // routes it through the encoder's float64 branch without reaching into the
  // library's internals. (Proper fix upstreamed in bsharper/atvjs#1.)
  await conn.protocol.sendCommand("_mcc", { _mcc: 7, _skpS: seconds + 1e-9 });
}
