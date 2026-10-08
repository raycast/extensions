import { InfisicalSDK } from "@infisical/sdk";
import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";

const { siteUrl, clientId, clientSecret, organizationId, disableTokenVerification } =
  getPreferenceValues<Preferences>();

const client = new InfisicalSDK({
  siteUrl,
});
export const infisical = client;

export const authenticate = async () => {
  const toast = await showToast(Toast.Style.Animated, "Fetching Token");
  const token = await LocalStorage.getItem<string>("token");
  if (token) {
    infisical.auth().accessToken(token);
  } else {
    toast.title = "Authenticating";
    await client.auth().universalAuth.login({
      clientId,
      clientSecret,
    });
  }
  if (disableTokenVerification) {
    await toast.hide();
    return;
  }

  toast.title = "Verifying";
  try {
    // we call this endpoint to check if token is valid
    await callInfisical(`v2/organizations/${organizationId}/workspaces`);
    const newToken = client.auth().getAccessToken() ?? "";
    await LocalStorage.setItem("token", newToken);
    toast.style = Toast.Style.Success;
    toast.title = "Authenticated";
  } catch {
    // if token is invalid, we attempt to renew in case token is stale
    toast.title = "Renewing";
    // if this renew fails, details are invalid
    await client.auth().universalAuth.renew();
    const renewToken = client.auth().getAccessToken() ?? "";
    await LocalStorage.setItem("token", renewToken);
  }
};

export const callInfisical = async <T>(endpoint: string) => {
  const token = infisical.auth().getAccessToken();
  const response = await fetch(new URL(`api/${endpoint}`, siteUrl), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error((result as Error).message);
  return result as T;
};
