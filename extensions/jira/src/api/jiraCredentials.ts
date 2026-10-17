import { Cache, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import fetch from "node-fetch";

import { User } from "./users";
import { parseJiraResponse } from "./response";

type JiraCredentials = {
  cloudId?: string;
  siteUrl: string;
  authorizationHeader: string;
  myself: User;
};

type CachedJiraSite = Pick<JiraCredentials, "cloudId" | "siteUrl" | "myself">;

const siteCache = new Cache({ namespace: "jira-credentials" });

function readCachedSite(accountKey: string): CachedJiraSite | null {
  const raw = siteCache.get(accountKey);
  if (!raw) {
    return null;
  }

  try {
    const cached = JSON.parse(raw) as Partial<CachedJiraSite>;
    if (typeof cached.siteUrl !== "string" || !cached.myself || typeof cached.myself.accountId !== "string") {
      return null;
    }
    return cached as CachedJiraSite;
  } catch {
    return null;
  }
}

function writeCachedSite(accountKey: string, site: CachedJiraSite) {
  siteCache.set(accountKey, JSON.stringify(site));
}

async function resolveCredentials(
  accountKey: string,
  authorizationHeader: string,
  load: () => Promise<CachedJiraSite>,
) {
  const apply = (site: CachedJiraSite) => {
    jiraCredentials = { ...site, authorizationHeader };
  };

  const loadAndCache = async () => {
    const site = await load();
    apply(site);
    writeCachedSite(accountKey, site);
  };

  const cachedSite = readCachedSite(accountKey);
  if (!cachedSite) {
    await loadAndCache();
    return;
  }

  apply(cachedSite);
  loadAndCache().catch(() => {
    siteCache.remove(accountKey);
  });
}

async function fetchMyself(url: string, authorizationHeader: string) {
  const myselfResponse = await fetch(url, {
    headers: {
      Authorization: authorizationHeader,
      Accept: "application/json",
    },
  });

  return { myselfResponse, myself: await parseJiraResponse<User>(myselfResponse) };
}

export const jiraWithApiToken = {
  authorize: async () => {
    const { siteUrl, token, email } = getPreferenceValues();

    let hostname;
    try {
      hostname = new URL(siteUrl).host;
    } catch {
      // If the URL isn't valid, assume a hostname was entered directly
      hostname = siteUrl;
    }

    const authorizationHeader = `Basic ${btoa(`${email}:${token}`)}`;

    await resolveCredentials(`api-token:${email}@${hostname}`, authorizationHeader, async () => {
      let myselfResponse;
      try {
        const result = await fetchMyself(`https://${hostname}/rest/api/3/myself`, authorizationHeader);
        myselfResponse = result.myselfResponse;
        if (!result.myself) {
          throw new Error("Jira returned an empty user response.");
        }
        return { siteUrl: hostname, myself: result.myself };
      } catch {
        throw new Error(
          `Error authenticating with Jira. Error code: ${myselfResponse?.status ?? "unknown"}. Please check your credentials in the extension preferences.`,
        );
      }
    });

    return token;
  },
};

const oauthSiteCacheKey = "oauth";

export const jira = OAuthService.jira({
  clientId: "NAeIO0L9UVdGqKj5YF32HhcysfBCP31P",
  authorizeUrl: "https://jira.oauth.raycast.com/authorize",
  tokenUrl: "https://jira.oauth.raycast.com/token",
  refreshTokenUrl: "https://jira.oauth.raycast.com/refresh-token",
  scope: "read:jira-user read:jira-work write:jira-work offline_access read:sprint:jira-software",
  async onAuthorize({ token }) {
    const authorizationHeader = `Bearer ${token}`;

    await resolveCredentials(oauthSiteCacheKey, authorizationHeader, async () => {
      const sitesResponse = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
        headers: {
          Authorization: authorizationHeader,
          Accept: "application/json",
        },
      });

      const sites = await parseJiraResponse<{ id: string; url: string }[]>(sitesResponse);

      if (!sites || sites.length === 0) {
        throw new Error("No Jira site is accessible with this account.");
      }

      const site = sites[0];
      const { myself } = await fetchMyself(
        `https://api.atlassian.com/ex/jira/${site.id}/rest/api/3/myself`,
        authorizationHeader,
      );
      if (!myself) {
        throw new Error("Jira returned an empty user response.");
      }

      return { cloudId: site.id, siteUrl: site.url, myself };
    });
  },
});

// The cached site belongs to the account that signed in last. Signing in through the browser is
// the only point where another account can be connected (first connection, or a re-connection after
// the refresh token was rejected), so the cached site is dropped before the sign-in starts. Stored
// tokens are reused or refreshed without a sign-in, and those keep the account.
const signIn = jira.client.authorize.bind(jira.client);
jira.client.authorize = (options) => {
  siteCache.remove(oauthSiteCacheKey);
  return signIn(options);
};

let jiraCredentials: JiraCredentials | null = null;

export function getJiraCredentials() {
  if (!jiraCredentials) {
    throw new Error("getJiraCredentials must be used when authenticated");
  }

  return jiraCredentials;
}
