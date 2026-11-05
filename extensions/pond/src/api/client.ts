import { getApplications, getPreferenceValues } from "@raycast/api";
import { PondApi, PondApiError } from "pond-api";
import { PondProblem, supportsApi } from "./problems";

interface Preferences {
  token: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:41610/api/v2";
const BUNDLE_ID = "so.pond.desktop";
const TIMEOUT = 60_000;

let ready: Promise<void> | null = null;

function timedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(TIMEOUT) });
}

async function isInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some((application) => application.bundleId === BUNDLE_ID);
}

async function verify(probe: PondApi): Promise<void> {
  try {
    const info = await probe.appInfo();
    if (!supportsApi(info.apiVersion)) throw new PondProblem("outdated", `You have Pond ${info.version}.`);
  } catch (error) {
    if (error instanceof PondApiError && error.kind === "connection") {
      throw new PondProblem((await isInstalled()) ? "not-running" : "not-installed", error.message);
    }
    throw error;
  }
}

/** Checks the running Pond once per process, and again after any failed check. */
function ensureReady(probe: PondApi): Promise<void> {
  ready ??= verify(probe).catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export function pond(): PondApi {
  const preferences = getPreferenceValues<Preferences>();
  const baseUrl = preferences.baseUrl?.trim() || DEFAULT_BASE_URL;
  const token = preferences.token.trim();
  let probe: PondApi;
  try {
    probe = new PondApi({ baseUrl, fetch: timedFetch });
  } catch (error) {
    throw new PondProblem("misconfigured", error instanceof Error ? error.message : "Enter a valid Local API URL.");
  }
  return new PondApi({ baseUrl, token, fetch: timedFetch, ensureAvailable: () => ensureReady(probe) });
}
