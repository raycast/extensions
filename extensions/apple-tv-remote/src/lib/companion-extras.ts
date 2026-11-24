/**
 * Companion-protocol requests that @bharper/atv-js doesn't expose: refusal
 * checks, app launching and listing, raw HID presses, and seconds-based skip.
 * Payloads are ported from pyatv (pyatv/protocols/companion/api.py) and sent
 * over the library's public `CompanionProtocol.sendCommand`.
 */
import { AppleTVConnection, HidCommand } from "@bharper/atv-js";
import { RefusedError } from "./errors";

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send a request, throwing when the Apple TV refuses it. tvOS answers a
 * refused request with an error frame rather than an error status (`_launchApp`
 * on tvOS 26 replies `FBSOpenApplicationErrorDomain` code 4), and the library
 * resolves any response, so without this a refusal reads as success.
 */
async function send(conn: AppleTVConnection, identifier: string, content: Record<string, unknown> = {}) {
  const response = await conn.protocol.sendCommand(identifier, content);
  const union = response._eu as Record<string, unknown> | undefined;
  const code = union?._ec ?? response._ec;
  const domain = union?._ed ?? response._ed;
  if (code || domain) throw new RefusedError(identifier, [domain, code && `code ${code}`].filter(Boolean).join(", "));
  return response;
}

/** Launch an app by bundle ID (`com.netflix.Netflix`) or deep-link a URL (anything with `://`). */
export async function launchApp(conn: AppleTVConnection, bundleIdOrUrl: string): Promise<void> {
  await send(conn, "_launchApp", { [bundleIdOrUrl.includes("://") ? "_urlS" : "_bundleID"]: bundleIdOrUrl });
}

/**
 * Installed apps as bundle ID → display name. tvOS 26 silently drops this
 * query unless a TV Remote Client session is open (pyatv PR #2855). The
 * library's connect() predates that, and key presses don't need the session,
 * so it is opened here by the one request that does.
 */
export async function listApps(conn: AppleTVConnection): Promise<Record<string, string>> {
  await send(conn, "TVRCSessionStart", { ProtocolVersionKey: "1.2" });
  const response = await send(conn, "FetchLaunchableApplicationsEvent");
  return (response._c ?? {}) as Record<string, string>;
}

/** Press a HID button: down, wait `holdMs` (a hold opens menus at ~1s), up. */
export async function pressHid(conn: AppleTVConnection, command: HidCommand, holdMs = 0): Promise<void> {
  await send(conn, "_hidC", { _hBtS: 1, _hidC: command });
  if (holdMs) await delay(holdMs);
  await send(conn, "_hidC", { _hBtS: 2, _hidC: command });
}

/** MediaControl commands (pyatv MediaControlCommand). Unlike the remote's toggle, Play and Pause are idempotent. */
export const MediaControl = { Play: 1, Pause: 2, SkipBy: 7 } as const;

/** Send a MediaControl command to whichever app owns the current player. */
export async function mediaControl(conn: AppleTVConnection, command: number, args: Record<string, unknown> = {}) {
  await send(conn, "_mcc", { _mcc: command, ...args });
}

/**
 * Skip within the current media by N seconds (negative = backward), the path
 * pyatv uses. The library's OPACK packer rejects negative integers and pyatv
 * sends `_skpS` as a float anyway, so nudging the value off the integer grid
 * routes it through the float encoder.
 */
export async function skipBy(conn: AppleTVConnection, seconds: number): Promise<void> {
  await mediaControl(conn, MediaControl.SkipBy, { _skpS: seconds + 1e-9 });
}
