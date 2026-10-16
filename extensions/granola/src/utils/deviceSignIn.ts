import { LocalStorage, open } from "@raycast/api";
import { setTimeout as delay } from "node:timers/promises";
import { granolaOAuth } from "./getAccessToken";
import {
  DeviceGrant,
  GranolaSignInError,
  exchangeToken,
  nextPoll,
  parseTokens,
  requestDeviceGrant,
} from "./granolaAuthProtocol";
import { diagnostic } from "./diagnostics";

// Opening the browser hides Raycast, and Store builds may unload the command
// soon after, which kills the polling loop before the user approves. Persist
// the device grant so whichever Granola command opens next can finish it.
// LocalStorage is encrypted and scoped to this extension, and the device code
// is short-lived (capped at 15 minutes) and useless once redeemed.
export const PENDING_SIGN_IN = "granola-pending-sign-in";
export type PendingSignIn = DeviceGrant & { deadline: number };

export async function readPendingSignIn(): Promise<PendingSignIn | undefined> {
  const raw = await LocalStorage.getItem<string>(PENDING_SIGN_IN);
  if (!raw) return;
  try {
    const pending = JSON.parse(raw) as PendingSignIn;
    // Validate everything the poll loop and sign-in view rely on; a bad
    // interval would turn the loop into a tight retry against the auth server.
    if (
      typeof pending.device_code === "string" &&
      typeof pending.user_code === "string" &&
      typeof pending.verification_uri_complete === "string" &&
      typeof pending.interval === "number" &&
      pending.interval > 0 &&
      typeof pending.deadline === "number" &&
      pending.deadline > Date.now()
    )
      return pending;
  } catch {
    /* Discard unreadable state below. */
  }
  // Expired or malformed: clear it so the user gets a fresh sign-in screen.
  await clearPendingSignIn();
}

export const clearPendingSignIn = () => LocalStorage.removeItem(PENDING_SIGN_IN);

/**
 * Runs the device sign-in until a session exists. Resolves "saved" when this
 * process stored the session, or "existing" when another command did.
 * Throws on failure; an abort (unmount or cancel) rejects with AbortError.
 */
export async function runDeviceSignIn(options: {
  signal: AbortSignal;
  resume?: PendingSignIn;
  onGrant: (device: DeviceGrant) => void | Promise<void>;
}): Promise<"saved" | "existing"> {
  const { signal, resume, onGrant } = options;
  try {
    // A resumed grant keeps its original absolute deadline; a new one is
    // saved before the browser opens, since that may end this process.
    const device = resume ?? (await requestDeviceGrant(signal));
    const deadline = resume?.deadline ?? Date.now() + device.expires_in * 1000;
    if (!resume) await LocalStorage.setItem(PENDING_SIGN_IN, JSON.stringify({ ...device, deadline }));
    await onGrant(device);
    // Don't reopen the browser on resume; the user has usually approved
    // already, and "Continue in Browser" is still available if not.
    if (!resume) await open(device.verification_uri_complete);
    let interval = device.interval;
    // A resumed sign-in may already be approved, so check before waiting.
    let wait = !resume;
    while (Date.now() < deadline) {
      if (wait) await delay(Math.min(interval * 1000, Math.max(0, deadline - Date.now())), undefined, { signal });
      wait = true;
      if (Date.now() >= deadline) break;
      const { response, body } = await exchangeToken(
        { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: device.device_code },
        signal,
      );
      if (response.ok) {
        const tokens = parseTokens(body);
        signal.throwIfAborted();
        await granolaOAuth.setTokens(tokens);
        await clearPendingSignIn();
        diagnostic("auth.session_saved", { code: "device_grant" });
        return "saved";
      }
      // Two commands can poll the same saved grant. Only one can redeem the
      // device code; the other gets an error, so check whether the winner
      // already saved a session before treating it as a failure.
      if (body.error !== "authorization_pending" && body.error !== "slow_down") {
        if ((await granolaOAuth.getTokens())?.accessToken) return "existing";
      }
      interval = nextPoll(body.error, interval);
    }
    throw new GranolaSignInError("expired", "Your sign-in code expired.");
  } catch (e) {
    // An abort means the view unmounted or the user cancelled (cancel clears
    // the grant itself). Keep the grant on unmount so the next command can
    // resume it, and keep it on network errors so reopening retries;
    // declined, expired, and unknown outcomes are final.
    if (!signal.aborted && !(e instanceof GranolaSignInError && e.kind === "connection")) await clearPendingSignIn();
    throw e;
  }
}
