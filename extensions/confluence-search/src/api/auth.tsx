import { confirmAlert, Icon, popToRoot } from "@raycast/api";
import { authorize as oauthAuthorize, refreshTokenIfRequired, scopes } from "./oauth";
import { getOrSetDefaultSite, hasSiteGotRequiredScopes, Site } from "./site";

export class SiteMissingScopesError extends Error {
  constructor(msg: string) {
    super(msg);
    Object.setPrototypeOf(this, SiteMissingScopesError.prototype);
  }
}

async function checkSiteHasRequiredScopes(activeSite: Site) {
  if (hasSiteGotRequiredScopes(activeSite, scopes)) {
    return true;
  }

  console.warn(`Required scopes are missing for site ${activeSite.url}`);
  const reauth = await confirmAlert({
    title: "New permissions required",
    message: "Updates to this extension require you to re-authorize access.",
    icon: Icon.TwoArrowsClockwise,
    primaryAction: {
      title: "Re-authorize",
    },
    dismissAction: {
      title: "Not now",
    },
  });

  if (reauth) {
    const didANewAuthFlow = await oauthAuthorize(true); // force reauth
    await getOrSetDefaultSite(didANewAuthFlow);
    return true;
  } else {
    await popToRoot();
    return false;
  }
}

export async function authorizeSite(checkScopes = true) {
  const didANewAuthFlow = await oauthAuthorize();
  const activeSite = await getOrSetDefaultSite(didANewAuthFlow);

  if (checkScopes) {
    const hasRequiredScopes = await checkSiteHasRequiredScopes(activeSite);
    if (!hasRequiredScopes) throw new SiteMissingScopesError("Site doesn't have required scopes.");
  }

  return activeSite;
}

export async function apiAuthorize() {
  await refreshTokenIfRequired();
}
