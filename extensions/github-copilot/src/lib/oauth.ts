import { Octokit } from "@octokit/rest";
import { OAuth } from "@raycast/api";
import { OAuthService, useCachedState } from "@raycast/utils";
import { Repository } from "../services/repositories";

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

let octokitInstance: Octokit | null = null;

export const provider = new OAuthService({
  client,
  clientId: CLIENT_ID,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scope: SCOPES,
  onAuthorize: ({ token }) => {
    const [, setPreviousRepositories] = useCachedState<Repository[]>("previousRepositories", []);
    setPreviousRepositories([]);

    octokitInstance = new Octokit({ auth: token });
  },
  extraParameters: {
    prompt: "consent",
  },
});

export const reauthorize = async (): Promise<string> => {
  await client.removeTokens();
  return provider.authorize();
};

export const getOctokit = (): Octokit => {
  if (!octokitInstance) {
    throw new Error("Octokit instance not initialized. Please authenticate first.");
  }

  return octokitInstance;
};
