import { Connections } from "./connections";
import { Deps } from "./deps";
import { claudeKeychainService, readKeychainItemDate } from "./keychain";
import { ProviderError, ProviderErrorKind, ProviderId, Settings } from "./types";
import {
  CLI_SIGN_IN,
  CURSOR_BUNDLE_ID,
  findExecutable,
  openApp,
  openInTerminal,
  readCodexLogin,
  readCursorLogin,
  readGeminiLogin,
  resolveUserEnv,
  waitFor,
} from "./sign-in";

// Connect is the one-click sign-in for each provider. The UI runs the OAuth methods itself. The local ones are run here
// with the helpers in sign-in.ts and keychain.ts. Nothing here imports Raycast, so the flows are tested with fakeDeps.

export type ApiKeyField = "openrouterApiKey" | "zaiApiKey" | "kimiApiKey" | "deepseekApiKey" | "moonshotApiKey";
export type RegionField = "zaiRegion" | "moonshotRegion";

// How a provider connects. "github" and "openrouter" use Raycast's OAuth and are run by the UI.
export type ConnectMethod =
  | { kind: "claude" }
  | { kind: "codex" }
  | { kind: "gemini" }
  | { kind: "cursor" }
  | { kind: "github" }
  | { kind: "openrouter" }
  | {
      kind: "api-key";
      field: ApiKeyField;
      region?: RegionField;
      keyUrl: string;
      keyPattern: RegExp;
      placeholder: string;
    };

export type LocalConnectMethod = Extract<ConnectMethod, { kind: "claude" | "codex" | "gemini" | "cursor" }>;

// Whether a Connect can be stopped while it runs. The local sign-ins wait on a CLI or the app on this Mac, which stops
// when the signal aborts. The OAuth ones run in Raycast's browser flow, which can't be stopped, so a retry waits for them.
export function isStoppableConnect(method: ConnectMethod): method is LocalConnectMethod {
  return method.kind === "claude" || method.kind === "codex" || method.kind === "gemini" || method.kind === "cursor";
}

// What verify found. "ok" means the provider answered. "broken" means the provider rejected the login, can't find one or
// can't read it. "denied" means macOS refused the Keychain read, which says nothing about whether the login is good.
export type LoginCheck = "ok" | "broken" | "denied";

// The errors that mean the login itself can't be used.
const BROKEN_KINDS = new Set<ProviderErrorKind>(["auth", "not-connected", "parse"]);

// Turns the error from a provider's fetch into a check. A login that is rejected, missing or unreadable is "broken". A
// failure that is none of those (no network, for example) says nothing about the login, so it counts as "ok" too. An
// account the provider doesn't serve counts as "ok" as well: the login works, and signing in again would change nothing.
export function loginCheckFromError(error: unknown): LoginCheck {
  if (error instanceof ProviderError && error.code === "keychain-denied") {
    return "denied";
  }
  if (error instanceof ProviderError && error.code === "account-unsupported") {
    return "ok";
  }
  if (error instanceof ProviderError && BROKEN_KINDS.has(error.kind)) {
    return "broken";
  }
  return "ok";
}

// Whether Connect would have no effect. A credential typed into the preferences overrides what Connect saves, so Connect
// is hidden for that provider. `preferences` is the settings built from the preferences alone.
export function isConnectOverridden(method: ConnectMethod, preferences: Settings): boolean {
  switch (method.kind) {
    case "github":
      return preferences.githubToken !== undefined;
    case "openrouter":
      return preferences.openrouterApiKey !== undefined;
    case "api-key":
      return preferences[method.field] !== undefined;
    default:
      return false;
  }
}

// The fallbacks that save a cookie, by provider, and the Settings field each one saves. A cookie typed into the
// preferences is used instead of the saved one, so the fallback's action is hidden while that preference is set.
const FALLBACK_FIELDS: Partial<Record<ProviderId, "claudeSessionKey" | "cursorCookie">> = {
  claude: "claudeSessionKey",
  cursor: "cursorCookie",
};

// Whether a fallback's action would have no effect. `preferences` is the settings built from the preferences alone.
export function isFallbackOverridden(providerId: ProviderId, preferences: Settings): boolean {
  const field = FALLBACK_FIELDS[providerId];
  return field !== undefined && preferences[field] !== undefined;
}

export interface ConnectUi {
  // Shows what Connect is doing now, such as "Finish signing in in Terminal".
  progress(title: string, message?: string): void;
  // Stores credentials the extension keeps itself (LocalStorage in the real UI). Resolves to the connections after the
  // save.
  save(patch: Partial<Connections>): Promise<Connections>;
  // Fetches this provider's usage with the latest saved connections, and says whether the login works.
  verify(): Promise<LoginCheck>;
  // Aborted when the user leaves the command or Disconnects, which stops any waiting and any saving.
  signal?: AbortSignal;
  // Replaces the wait between checks in tests. The real UI leaves it out.
  sleep?: (ms: number) => Promise<void>;
}

export type ConnectOutcome =
  { kind: "connected" } | { kind: "failed"; title: string; message?: string; help?: { title: string; url: string } };

// The sign-in runs outside Raycast (in Terminal, or in the Cursor app), so the login is checked every few seconds
// for up to 10 minutes.
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 10 * 60_000;
const GEMINI_INSTALL_URL = "https://github.com/google-gemini/gemini-cli";
const CURSOR_DOWNLOAD_URL = "https://cursor.com/download";

const CONNECTED: ConnectOutcome = { kind: "connected" };
// Stopping Connect (closing the command, or Disconnect) ends the wait, but a sign-in already started keeps going in
// Terminal or the app. The UI shows nothing for a stopped Connect, so this text is never displayed.
const STOPPED: ConnectOutcome = {
  kind: "failed",
  title: "Connect stopped",
  message: "Finish signing in, then refresh",
};

// The env command sets or unsets CLAUDE_CONFIG_DIR or CODEX_HOME for one CLI. It is referenced by absolute path, like
// the tools.
const ENV = "/usr/bin/env";

// Each sign-in starts with the login that is already there. When it works (ui.verify), nothing is run. Otherwise the
// sign-in runs and the login is polled until a new one appears.
export async function connectLocal(deps: Deps, method: LocalConnectMethod, ui: ConnectUi): Promise<ConnectOutcome> {
  switch (method.kind) {
    case "claude":
      return connectClaude(deps, ui);
    case "codex":
      return connectCodex(deps, ui);
    case "gemini":
      return connectGemini(deps, ui);
    case "cursor":
      return connectCursor(deps, ui);
  }
}

// A refresh that runs during Connect can turn the Keychain setting off when macOS refuses it. Once the login works, the
// setting is saved on again, so the refresh after Connect reads the Keychain. A Connect stopped by then saves nothing.
async function connectClaude(deps: Deps, ui: ConnectUi): Promise<ConnectOutcome> {
  const outcome = await connectClaudeLogin(deps, ui);
  if (outcome.kind === "connected" && !ui.signal?.aborted) {
    await ui.save({ claudeKeychain: true });
  }
  return outcome;
}

// Clicking Connect is the consent to read Claude Code's login, so the setting is saved before anything is read.
async function connectClaudeLogin(deps: Deps, ui: ConnectUi): Promise<ConnectOutcome> {
  // A Connect stopped before this saves nothing and reads nothing.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  // The login shell is asked first, for the PATH and the config folder Claude Code is signed in to. No login is read.
  const env = await resolveUserEnv(deps);
  // A Connect stopped while the shell ran must not save, since Disconnect may have run.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  // The folder is saved with the setting, before any login is read, so the reads below and every later refresh use it.
  // An undefined folder keeps the one saved before, since the shell couldn't be asked.
  const saved = await ui.save({ claudeKeychain: true, claudeConfigDir: env.claudeConfigDir });
  ui.progress("Connecting Claude Code", "If macOS asks for access to Claude Code's login, choose Always Allow");

  // The same folder claude.ts reads from: the saved one, else the extension's environment.
  const configDir = saved.claudeConfigDir || deps.env.CLAUDE_CONFIG_DIR;
  // The marker comes from the item's attributes, which never open macOS's access dialog.
  const before = await readClaudeMarker(deps, configDir);
  // With no login there is nothing to verify, so the sign-in starts at once.
  if (before === null) {
    return signInClaude(deps, ui, env.path, configDir, before);
  }
  // A Connect stopped while the setting was saved doesn't verify.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  // verify is the only read of the password in Connect, so it is the one that can show macOS's access dialog. A refusal
  // comes back as "denied", and Terminal is not opened for it, since that says nothing about the login.
  const check = await ui.verify();
  if (check === "ok") {
    return CONNECTED;
  }
  if (check === "denied") {
    return keychainDenied(ui);
  }
  return signInClaude(deps, ui, env.path, configDir, before);
}

// Turning the setting back off stops later refreshes from asking macOS again. Choosing Connect turns it on again.
async function keychainDenied(ui: ConnectUi): Promise<ConnectOutcome> {
  await ui.save({ claudeKeychain: false });
  return {
    kind: "failed",
    title: "macOS denied access to Claude Code's login",
    message: "Choose Connect again and click Always Allow",
  };
}

// `path` is the user's PATH, and `configDir` is the folder Claude Code is signed in to, as connectClaude resolved them.
async function signInClaude(
  deps: Deps,
  ui: ConnectUi,
  path: string,
  configDir: string | undefined,
  before: string | null,
): Promise<ConnectOutcome> {
  const executable = await findExecutable(deps, CLI_SIGN_IN.claude.name, path);
  if (!executable) {
    // Connect saved the Keychain setting above, but there is nothing to read without Claude Code. It is turned back off
    // so the item doesn't show Disconnect for nothing.
    await ui.save({ claudeKeychain: false });
    return {
      kind: "failed",
      title: "Claude Code isn't installed",
      message: "Install Claude Code, then choose Connect again",
      help: { title: "Install Claude Code", url: CLI_SIGN_IN.claude.installUrl },
    };
  }
  return signInInTerminal(deps, ui, {
    argv: cliCommand("CLAUDE_CONFIG_DIR", configDir, executable, CLI_SIGN_IN.claude.args),
    progressTitle: "Finish signing in in Terminal",
    progressMessage: "Paste the code in Terminal if Claude Code asks for it",
    check: async () => isNewLogin(before, await readClaudeMarker(deps, configDir)),
    failure: "Claude Code sign-in didn't finish",
  });
}

// Claude Code's login marker, which is compared before and after a sign-in. On macOS it is the Keychain item's modified
// date. That is read without the access dialog, and Claude Code writes the item whenever it writes a login. The
// credentials file is the marker when there is no item, which is where claude.ts reads the login then. An item whose date
// can't be read gives no marker, so nothing is compared.
async function readClaudeMarker(deps: Deps, configDir: string | undefined): Promise<string | null> {
  const item = await readKeychainItemDate(deps, claudeKeychainService(configDir));
  if (item.kind === "found") {
    return item.modified;
  }
  if (item.kind === "error") {
    return null;
  }
  return readClaudeCredentials(deps, configDir);
}

// The credentials file Claude Code keeps outside the Keychain, as text. An unreadable file counts as missing.
async function readClaudeCredentials(deps: Deps, configDir: string | undefined): Promise<string | null> {
  const folder = configDir || `${deps.homedir}/.claude`;
  try {
    return await deps.readFile(`${folder}/.credentials.json`);
  } catch {
    return null;
  }
}

// Whether a login read after sign-in counts as new. Any login counts when there was none before. Otherwise it must
// differ from the login read before the sign-in, since the rejected one stays in place until the CLI replaces it.
function isNewLogin(before: string | null, after: string | null): boolean {
  return after !== null && (before === null || after !== before);
}

async function connectCodex(deps: Deps, ui: ConnectUi): Promise<ConnectOutcome> {
  // A Connect stopped before this saves nothing and reads nothing.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  // The login shell is asked first, for the PATH and for the folder Codex is signed in to. No login is read yet.
  const env = await resolveUserEnv(deps);
  // A Connect stopped while the shell ran must not save, since Disconnect may have run.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  // The folder is saved before the login is read, so the read below and later refreshes use the same folder. An
  // undefined folder keeps the one saved before, since the shell couldn't be asked.
  const saved = await ui.save({ codexHome: env.codexHome });
  // The same folder codex.ts reads from: the saved one, else the extension's environment.
  const codexHome = saved.codexHome || deps.env.CODEX_HOME;
  const before = await readCodexLogin(deps, codexHome);
  // A Connect stopped while the login was read doesn't verify it.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  if (before !== null && (await ui.verify()) === "ok") {
    return CONNECTED;
  }

  const executable = await findExecutable(deps, CLI_SIGN_IN.codex.name, env.path);
  if (!executable) {
    return {
      kind: "failed",
      title: "Codex CLI isn't installed",
      help: { title: "Install Codex CLI", url: CLI_SIGN_IN.codex.installUrl },
    };
  }
  return signInInTerminal(deps, ui, {
    argv: cliCommand("CODEX_HOME", codexHome, executable, CLI_SIGN_IN.codex.args),
    progressTitle: "Finish signing in in Terminal",
    progressMessage: "Codex is waiting for its sign-in to finish",
    check: async () => isNewLogin(before, await readCodexLogin(deps, codexHome)),
    failure: "Codex sign-in didn't finish",
  });
}

async function connectGemini(deps: Deps, ui: ConnectUi): Promise<ConnectOutcome> {
  const before = await readGeminiLogin(deps);
  // A Connect stopped while the login was read doesn't verify it.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  if (before !== null && (await ui.verify()) === "ok") {
    return CONNECTED;
  }

  const executable = await findExecutable(deps, "gemini", (await resolveUserEnv(deps)).path);
  if (!executable) {
    return {
      kind: "failed",
      title: "Gemini CLI isn't installed",
      help: { title: "Install Gemini CLI", url: GEMINI_INSTALL_URL },
    };
  }
  // Gemini signs in through its own interactive screen, so it runs in Terminal, like Claude and Codex.
  return signInInTerminal(deps, ui, {
    argv: [executable],
    progressTitle: "Sign in to Gemini CLI in Terminal",
    progressMessage: "Choose Sign in with Google, then come back",
    check: async () => isNewLogin(before, await readGeminiLogin(deps)),
    failure: "Gemini CLI sign-in didn't finish",
  });
}

// Connect Cursor means the app's login. A cookie saved as a fallback is used before the app's login, so the cookie is
// left out of the check (usage.tsx does that), and it is cleared only once the app's login is confirmed. A cookie that
// works is kept when Cursor isn't installed or the sign-in doesn't finish.
async function connectCursor(deps: Deps, ui: ConnectUi): Promise<ConnectOutcome> {
  const outcome = await signInToCursor(deps, ui);
  if (outcome.kind === "connected") {
    await ui.save({ cursorCookie: "" });
  }
  return outcome;
}

async function signInToCursor(deps: Deps, ui: ConnectUi): Promise<ConnectOutcome> {
  const before = await readCursorLogin(deps);
  // A Connect stopped while the login was read doesn't verify it.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  if (before !== null && (await ui.verify()) === "ok") {
    return CONNECTED;
  }

  // A Connect stopped during the check above must not open the app.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  if (!(await openApp(deps, CURSOR_BUNDLE_ID))) {
    return {
      kind: "failed",
      title: "Cursor isn't installed",
      help: { title: "Download Cursor", url: CURSOR_DOWNLOAD_URL },
    };
  }
  ui.progress("Sign in to Cursor in the app", "Waiting for Cursor to finish signing in");
  return waitForLogin(
    deps,
    ui,
    async () => isNewLogin(before, await readCursorLogin(deps)),
    "Cursor sign-in didn't finish",
  );
}

// Opens Terminal with a CLI's sign-in, then waits for its login. The sign-in keeps running in Terminal after this
// returns, so it isn't stopped when the wait gives up.
async function signInInTerminal(
  deps: Deps,
  ui: ConnectUi,
  options: {
    argv: string[];
    progressTitle: string;
    progressMessage: string;
    check: () => Promise<boolean>;
    failure: string;
  },
): Promise<ConnectOutcome> {
  // A Connect stopped during the check before this must not open Terminal.
  if (ui.signal?.aborted) {
    return STOPPED;
  }
  try {
    await openInTerminal(deps, options.argv);
  } catch (error) {
    return {
      kind: "failed",
      title: "Couldn't open Terminal",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  ui.progress(options.progressTitle, options.progressMessage);
  return waitForLogin(deps, ui, options.check, options.failure);
}

// The command Terminal runs for a CLI. Terminal's shell may set another config folder than the one the extension reads,
// from the user's shell files. So the folder the extension reads is passed on the command line, and the variable is
// removed when there is none. Otherwise the login would be written to a folder the extension never reads.
function cliCommand(
  variable: string,
  value: string | undefined,
  executable: string,
  args: readonly string[],
): string[] {
  const envArgs = value ? [ENV, `${variable}=${value}`] : [ENV, "-u", variable];
  return [...envArgs, executable, ...args];
}

// Polls until the login is new. The clock comes from deps, so a test can move it forward. When the wait ends because
// the command closed, the result says so, since the sign-in may still be running.
async function waitForLogin(
  deps: Deps,
  ui: ConnectUi,
  check: () => Promise<boolean>,
  failure: string,
): Promise<ConnectOutcome> {
  const signedIn = await waitFor(check, {
    intervalMs: POLL_INTERVAL_MS,
    timeoutMs: POLL_TIMEOUT_MS,
    now: () => deps.now(),
    sleep: ui.sleep,
    signal: ui.signal,
  });
  if (signedIn) {
    return CONNECTED;
  }
  return ui.signal?.aborted ? STOPPED : { kind: "failed", title: failure };
}
