import { createHash } from "node:crypto";
import {
  Cache,
  environment,
  getPreferenceValues,
  LocalStorage,
  OAuth,
} from "@raycast/api";
import { serverOrigin } from "./domain";

export function origin() {
  const configured = getPreferenceValues<Preferences>().serverUrl?.trim();
  // A blank Server URL follows the build: `ray develop` talks to the local app.
  return serverOrigin(
    configured ||
      (environment.isDevelopment
        ? "http://localhost:3000"
        : "https://app.ttrackii.com"),
  );
}
function serverKey() {
  return createHash("sha256").update(origin()).digest("hex").slice(0, 16);
}
export function tokenStore() {
  // Device authorization is implemented separately; only Raycast's secure token storage is used here.
  return new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "ttrackii",
    providerIcon: "icon.png",
    providerId: `ttrackii-raycast-${serverKey()}`,
  });
}
const prefix = () => `ttrackii:${serverKey()}:`;

// The menu bar shows its first render, so it can't wait on the async token
// store or LocalStorage. This synchronous cache (shared by every command)
// mirrors just what that first render needs: whether a session exists and the
// latest timer snapshot. The secure token store stays the source of truth.
const menuCache = new Cache();
export function menuState<T>(): { signedIn: boolean; timer?: Snapshot<T> } {
  const signedIn = menuCache.get(`${prefix()}signedIn`) === "1";
  let timer: Snapshot<T> | undefined;
  try {
    const raw = signedIn ? menuCache.get(`${prefix()}timer`) : undefined;
    timer = raw ? (JSON.parse(raw) as Snapshot<T>) : undefined;
  } catch {
    timer = undefined;
  }
  return { signedIn, timer };
}
function rememberSignedIn(signedIn: boolean) {
  if (signedIn) menuCache.set(`${prefix()}signedIn`, "1");
  else {
    menuCache.remove(`${prefix()}signedIn`);
    menuCache.remove(`${prefix()}timer`);
  }
}
export async function read<T>(key: string): Promise<T | undefined> {
  const raw = await LocalStorage.getItem<string>(prefix() + key);
  if (!raw) return;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return;
  }
}
export async function write(key: string, value: unknown) {
  await LocalStorage.setItem(prefix() + key, JSON.stringify(value));
}
export async function remove(key: string) {
  await LocalStorage.removeItem(prefix() + key);
}
export async function clearAccount() {
  const items = await LocalStorage.allItems();
  await Promise.all(
    Object.keys(items)
      .filter((key) => key.startsWith(prefix()))
      .map((key) => LocalStorage.removeItem(key)),
  );
}
export async function forgetSession() {
  rememberSignedIn(false);
  await tokenStore().removeTokens();
  await clearAccount();
}
/** Stores a new device session, replacing any account data from a previous one. */
export async function saveSession(accessToken: string, expiresIn: number) {
  await clearAccount();
  await tokenStore().setTokens({ accessToken, expiresIn });
  rememberSignedIn(true);
}
/** Thrown whenever the command needs a session it does not have; views answer it by showing sign-in. */
export class SignedOutError extends Error {
  constructor(message = "Sign in to ttrackii to continue.") {
    super(message);
  }
}
export async function accessToken() {
  const tokens = await tokenStore().getTokens();
  if (!tokens?.accessToken || tokens.isExpired()) {
    await forgetSession();
    throw new SignedOutError();
  }
  return tokens.accessToken;
}
/** Identifies the current session without exposing it; cache keys include it. */
export async function sessionKey() {
  const tokens = await tokenStore().getTokens();
  return tokens?.accessToken
    ? createHash("sha256").update(tokens.accessToken).digest("hex").slice(0, 16)
    : undefined;
}
export async function isSignedIn() {
  const tokens = await tokenStore().getTokens();
  const signedIn = Boolean(tokens?.accessToken && !tokens.isExpired());
  rememberSignedIn(signedIn);
  return signedIn;
}
export type Snapshot<T> = { data: T; savedAt: number };
export async function saveSnapshot<T>(key: string, data: T) {
  const snapshot = { data, savedAt: Date.now() };
  await write(key, snapshot);
  if (key === "timer")
    menuCache.set(`${prefix()}timer`, JSON.stringify(snapshot));
}
