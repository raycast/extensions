import {
  Alert,
  confirmAlert,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { KeitoApi } from "./keito/api";
import { AuthConfig, resolveAuthConfig } from "./keito/config";
import { errorMessage, errorTitle, isKeitoError } from "./keito/errors";
import { formatHours as formatHoursValue } from "./keito/normalize";
import {
  invalidateSessionOnSetupError,
  KeyValueStore,
  resolveSession,
  ResolvedSession,
  SESSION_KEY,
} from "./keito/session";
import { oauthFingerprint } from "./keito/oauth";
import { keitoOAuth } from "./keitoOAuth";
import { Project, TimeEntry } from "./keito/types";
import { WorkflowContext } from "./keito/workflows";
import { todayIn } from "./keito/dates";

/** Extension-wide preferences, typed by Raycast's generated raycast-env.d.ts. */
export function getKeitoPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export const store: KeyValueStore = LocalStorage;

export function getAuthConfig(): AuthConfig {
  return resolveAuthConfig(getKeitoPreferences());
}

/**
 * Whether this launch may open Keito's sign-in in the browser: only when the user started a view
 * or no-view command. Background refreshes and the menu bar never start a sign-in.
 */
export function canSignInInteractively(): boolean {
  return environment.launchType === LaunchType.UserInitiated && environment.entryPointMode !== "menu-bar";
}

let cachedApi: { key: string; api: KeitoApi } | undefined;

/** Build the API client from preferences. Throws a setup KeitoError when preferences are invalid. */
export function getApi(): KeitoApi {
  const auth = getAuthConfig();
  const key = auth.kind === "api_key" ? `${auth.accountId}\n${auth.token}` : "oauth";
  if (cachedApi?.key === key) return cachedApi.api;
  const api = new KeitoApi({
    ...(auth.kind === "api_key"
      ? { token: auth.token, accountId: auth.accountId }
      : { auth: keitoOAuth.provider({ interactive: canSignInInteractively() }) }),
    onRateLimited: (seconds) => {
      if (environment.launchType === LaunchType.UserInitiated) {
        showToast({
          style: Toast.Style.Animated,
          title: "Keito is rate limiting requests",
          message: `Retrying in ${seconds}s…`,
        });
      }
    },
  });
  cachedApi = { key, api };
  return api;
}

export async function getSession(options: { force?: boolean } = {}): Promise<ResolvedSession> {
  const auth = getAuthConfig();
  const api = getApi();
  try {
    let credentials: { token: string; accountId: string } | string;
    if (auth.kind === "oauth") {
      // Make sure someone is signed in (or sign in now) before trusting a stored identity.
      await keitoOAuth.getAccessToken({ interactive: canSignInInteractively() });
      credentials = oauthFingerprint(await keitoOAuth.getTokens());
    } else {
      credentials = { token: auth.token, accountId: auth.accountId };
    }
    return await resolveSession(credentials, () => api.getIdentity(), store, options);
  } catch (error) {
    await invalidateSessionOnSetupError(error, store);
    throw error;
  }
}

export async function getWorkflowContext(
  options: { interactive?: boolean } = {},
): Promise<WorkflowContext & { session: ResolvedSession }> {
  const session = await getSession();
  return {
    api: getApi(),
    userId: session.identity.userId,
    session,
    confirmReplace: options.interactive ? confirmReplaceRunning : undefined,
  };
}

/** Today's date in the Keito workspace timezone (falls back to this computer's timezone). */
export function todayString(session?: ResolvedSession): string {
  return todayIn(session?.identity.settings?.timezone);
}

export function formatHours(hours: number | undefined): string {
  return formatHoursValue(hours, getKeitoPreferences().timeFormat ?? "hours_minutes");
}

export function describeEntry(entry: Pick<TimeEntry, "projectName" | "taskName">): string {
  return `${entry.projectName} – ${entry.taskName}`;
}

export async function confirmReplaceRunning(running: TimeEntry | undefined): Promise<boolean> {
  return confirmAlert({
    icon: Icon.Clock,
    title: "Switch Timers?",
    message: running
      ? `A timer is already running for ${describeEntry(running)}${
          running.notes ? ` (“${running.notes}”)` : ""
        }. Stop it and start this one?`
      : "Another timer is already running in Keito. Stop it and start this one?",
    primaryAction: { title: "Stop and Switch", style: Alert.ActionStyle.Destructive },
  });
}

/** Sign out of Keito OAuth and forget the verified identity. API key preferences are untouched. */
export async function signOut() {
  await keitoOAuth.signOut();
  await store.removeItem(SESSION_KEY);
}

/** Show a failure toast. Setup problems also clear the stored identity and offer a way to fix them. */
export async function showKeitoError(error: unknown, fallbackTitle = "Keito request failed") {
  await invalidateSessionOnSetupError(error, store);
  // Log only the classification; error objects never include request headers.
  console.error(
    isKeitoError(error)
      ? `Keito error: ${error.kind} (${error.status ?? "no status"})`
      : `Keito error: ${errorMessage(error)}`,
  );
  const setup = isKeitoError(error) && error.isSetupProblem;
  await showFailureToast(new Error(errorMessage(error)), {
    title: isKeitoError(error) ? errorTitle(error) : fallbackTitle,
    message: errorMessage(error),
    primaryAction:
      isKeitoError(error) && error.kind === "signed_out"
        ? {
            title: "Sign In to Keito",
            onAction: () => launchCommand({ name: "connection", type: LaunchType.UserInitiated }),
          }
        : setup
          ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
          : undefined,
  });
}

export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // The menu bar command is disabled by default; nothing to refresh.
  }
}

/** `attempt` > 0 forces a fresh GET /users/me check. Errors are rendered by KeitoGate, not toasts. */
export function useKeitoSession(attempt = 0) {
  return usePromise((n: number) => getSession({ force: n > 0 }), [attempt], { onError: () => undefined });
}

/** Active projects, cached per company/identity scope. */
export function useProjects(scope: string | undefined) {
  // The scope argument keeps cached projects separate for each company and identity.
  const result = useCachedPromise(
    (key: string) => (key ? getApi().listProjects() : Promise.resolve([])),
    [scope ?? ""],
    {
      execute: !!scope,
      keepPreviousData: false,
      onError: (error) => showKeitoError(error, "Could not load projects"),
    },
  );
  const byId = useMemo(() => new Map<string, Project>((result.data ?? []).map((p) => [p.id, p])), [result.data]);
  return { ...result, data: result.data ?? [], byId };
}

/** Tasks assigned to one project, cached per scope and project. */
export function useProjectTasks(scope: string | undefined, projectId: string | null | undefined) {
  const result = useCachedPromise(
    (key: string, id: string) => (key && id ? getApi().listProjectTasks(id) : Promise.resolve([])),
    [scope ?? "", projectId ?? ""],
    {
      execute: !!scope && !!projectId,
      keepPreviousData: false,
      onError: (error) => showKeitoError(error, "Could not load tasks"),
    },
  );
  return { ...result, data: projectId ? (result.data ?? []) : [] };
}

export function useTimeEntries(session: ResolvedSession | undefined, date: string) {
  const result = useCachedPromise(
    (key: string, userId: string, day: string) =>
      key ? getApi().listTimeEntries({ userId, from: day, to: day }) : Promise.resolve([]),
    [session?.scope ?? "", session?.identity.userId ?? "", date],
    {
      execute: !!session,
      // Never show one day's entries under another day's heading and actions.
      keepPreviousData: false,
      onError: (error) => showKeitoError(error, "Could not load time entries"),
    },
  );
  return { ...result, data: result.data ?? [] };
}
