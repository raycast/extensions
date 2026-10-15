import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { PlaneClient } from "./client";
import {
  LEGACY_STORAGE_WORKSPACE_SLUG_KEY,
  STORAGE_OAUTH_WORKSPACE_SLUG_KEY,
  STORAGE_WORKSPACE_SLUG_KEY,
} from "../helpers/keys";
import { getAppInstallations } from "./installations";

const preferences = getPreferenceValues<Preferences>();
/** Raw preference value, used only to find a workspace slug saved before keys were trimmed. */
const RAW_API_KEY = preferences.API_KEY ?? "";
/** A pasted key with a stray space or newline is rejected by Plane as "Given API token is not valid". */
const API_KEY = RAW_API_KEY.trim();

let planeClient: PlaneClient | undefined;
let currentToken: string | undefined;

export function isApiKeyAuth() {
  return !!API_KEY;
}

function getSlugStorageKey(token: string) {
  return isApiKeyAuth() ? STORAGE_WORKSPACE_SLUG_KEY(token) : STORAGE_OAUTH_WORKSPACE_SLUG_KEY;
}

function createClient(workspaceSlug: string, token: string) {
  return isApiKeyAuth() ? new PlaneClient(workspaceSlug, undefined, token) : new PlaneClient(workspaceSlug, token);
}

/**
 * Reads the stored workspace slug. Earlier versions stored it under a key that contained the raw token;
 * that key is read once, moved to the hashed key, and removed.
 */
export async function getStoredWorkspaceSlug(token: string): Promise<string | undefined> {
  const key = getSlugStorageKey(token);
  const stored = await LocalStorage.getItem<string>(key);
  if (stored) return stored;

  // Saved before keys were trimmed: the hashed key was built from the untrimmed value.
  if (isApiKeyAuth() && token === API_KEY && RAW_API_KEY !== API_KEY) {
    const untrimmed = await LocalStorage.getItem<string>(STORAGE_WORKSPACE_SLUG_KEY(RAW_API_KEY));
    if (untrimmed) {
      await LocalStorage.setItem(key, untrimmed);
      return untrimmed;
    }
  }

  const legacyKey = LEGACY_STORAGE_WORKSPACE_SLUG_KEY(token);
  const legacy = await LocalStorage.getItem<string>(legacyKey);
  if (legacy) {
    await LocalStorage.setItem(key, legacy);
    await LocalStorage.removeItem(legacyKey);
    return legacy;
  }
  return undefined;
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Plane",
  providerIcon: "plane-icon.png",
  providerId: "plane",
  description: "Connect your Plane account",
});

const plane = new OAuthService({
  client,
  clientId: "CcWYeOV3L3Q05jIpB4w6xaJx8QW8AovL0fV4TnLd",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/dAAojlwLRis2jBTlrt8vrrmmaMYGJO0ZuPZb8awD6ouUaNVltt_bEeZACr4zFPcHvV0U5IVaAabS3IWAn0R-JN1vvk1g5WqXSrYpyH9SQAXQ2-nquGy9KhyrfKd8JnnBFC0kMLzniS13BIrr0F9mbrSMZuhXITeAlgHSnlJcqHBw7MMYbLNfwbMbeHPofwDPbroIsU1l8VVPQpu3Xba8L0jy6rBAQeczGhi0ghcoEfeuogNd5r3CRyU9WgCGoB3e7VqNvWNk5e0",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/9KXLatvC9QrbuSafABDqcnA8IZW-JXwd4FF4CvZ-C6LFXfbl8FONXyjGuaO1n2XEFIW6bvDFFWDKH5IB_9gupDVVPiAHt5_mNmQJTQ_OmF7AYcKe6fF3I13O_hYIOETpCPknFn9ww9arA93J2knoGIWRSE-FFoVB2_lBGL8xP8FaRaj8_S6M-fsKUOg1YyyOFaK6dIIN5LF8i6P5J8y_L8Q6hWu4ZyyxmLCKHmEyPY9uoK-6ZZ27W0LMIrNzSHTS",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/dERRhlRqcHTtXPJLaZZqs7h8JYsRPZrQeWpVvNN_5F9qd_Z6Hb1q6xr_iVeLUmKBj9Ewk3xHAuADSKCpQ1fb0rJq07vziFLkate0VW2zkV0a-xfj23KBoVM2y50aA4geUo7XQT4PS0MKFBIt44ZaD0QRnr3gdZIf37xWollM66pK35YAmuIgo4uFDFJnj1-A1zJ8FvuYL16tHK5qO4nK6SBKE-AktYpraqpziJUINAwN6ByKe_JO1MdvtGGeMb-5",
  scope: "read write",
  personalAccessToken: API_KEY || undefined,
  onAuthorize: async ({ token }) => {
    currentToken = token;
    const workspaceSlug = await getStoredWorkspaceSlug(token);
    if (workspaceSlug) {
      planeClient = createClient(workspaceSlug, token);
      return;
    }
    if (isApiKeyAuth()) {
      // AuthorizedView asks for the slug (there is no "list my workspaces" endpoint).
      return;
    }
    // OAuth: default to the first workspace that installed the app. "Change Workspace" lists all of them.
    try {
      const installations = await getAppInstallations({ accessToken: token });
      const firstSlug = installations[0]?.workspace_detail?.slug;
      if (firstSlug) {
        await LocalStorage.setItem(STORAGE_OAUTH_WORKSPACE_SLUG_KEY, firstSlug);
        planeClient = createClient(firstSlug, token);
      }
    } catch (error) {
      console.error("Failed to load Plane app installations", error);
    }
  },
});

/** Kept for compatibility: initializes the client without persisting the slug. */
export function initializePlaneClient(workspaceSlug: string, accessToken?: string, apiKey?: string) {
  planeClient = new PlaneClient(workspaceSlug, accessToken, apiKey);
  return planeClient;
}

/** Persists the slug for the current credentials (under the hashed key) and re-creates the client. */
export async function selectWorkspace(workspaceSlug: string) {
  const token = currentToken ?? API_KEY;
  if (!token) {
    throw new Error("Not signed in to Plane yet. Open any Plane command to authorize first.");
  }
  await LocalStorage.setItem(getSlugStorageKey(token), workspaceSlug);
  planeClient = createClient(workspaceSlug, token);
}

/** Returns the client or throws a message that tells the user what to do. */
export function requirePlaneClient(): PlaneClient {
  if (!planeClient) {
    throw new Error(
      isApiKeyAuth()
        ? "No Plane workspace selected. Open a Plane command (e.g. Search Work Items) once to enter your workspace slug."
        : "No Plane workspace found. Open a Plane command (e.g. Search Work Items) to sign in and pick a workspace.",
    );
  }
  return planeClient;
}

export { plane };
export { planeClient };
