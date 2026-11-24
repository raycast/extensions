import { Octokit } from "@octokit/rest";
import { AI, Cache, LocalStorage, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { CACHE_PREFIX } from "../services/inference-core";

const CLIENT_ID = "Ov23ctJbHO0idEBx76J5";
const SCOPES = "repo,workflow,read:org";
const AUTHORIZE_URL =
  "https://oauth.raycast.com/v1/authorize/ZJFTemDOnon9VgfOxbFostk2HJqDaHtXFizUhliOj5WNPEcL3n9Mjzf_NWXwTDo5UHmMpzAaX0hOk5GZggt_Gkq7J3VlakVu7C67POdoLtId--l3BOI9j-rxsyrYqdo4iFocQmEFYpNGY97ulVc";
const TOKEN_URL =
  "https://oauth.raycast.com/v1/token/iJqg8WNq5LKdm75IypyhlNY97FAffYDPq76nQ4XfEjlPF1ZwUq4mSlldpwhViz46X_biMUY6MOvB2ytQ8xP2s3y0dJ142g_0ywNHkuKpPYhs-nnzcXDFsfcDMMqvuDQNXDAte_jVRkXsKRD2r7o4Ucc";

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitHub",
  providerIcon: "github-logo.png",
  description: "Log in with your GitHub account to track and start Copilot coding agent sessions.",
});

const cache = new Cache();
let octokitInstance: Octokit | null = null;

export const provider = new OAuthService({
  client,
  clientId: CLIENT_ID,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scope: SCOPES,
  onAuthorize: ({ token }) => {
    octokitInstance = new Octokit({ auth: token });
  },
  extraParameters: {
    prompt: "consent",
  },
});

export const reauthorize = async (): Promise<string> => {
  cache.remove("previousRepositories");
  const storedItems = await LocalStorage.allItems();
  await Promise.all(
    Object.keys(storedItems)
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => LocalStorage.removeItem(key)),
  );
  await client.removeTokens();
  const token = await provider.authorize();
  try {
    await AI.refreshModels();
  } catch {
    // Ignore when AI models aren't enabled or the user isn't on Raycast Pro
  }
  return token;
};

// Model provider entry points run in the background outside of `withAccessToken`, where
// Raycast refuses to show the sign-in UI. Surface that as an actionable message instead.
export const authorizeModelProvider = async (): Promise<string> => {
  try {
    return await provider.authorize();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not available when command is launched in background")) {
      throw new Error("Sign in to GitHub first by opening any GitHub Copilot command.");
    }
    throw error;
  }
};

export const getOctokit = (): Octokit => {
  if (!octokitInstance) {
    throw new Error("Octokit instance not initialized. Please authenticate first.");
  }

  return octokitInstance;
};
