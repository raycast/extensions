import { InfisicalSDK } from "@infisical/sdk";
import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const {siteUrl,clientId,clientSecret,organizationId} = getPreferenceValues<Preferences>();
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
        clientSecret
    }) 
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
    // if token is valid, we attempt to renew in case token is stale
    toast.title = "Renewing";
    // if this renew fails, details are invalid
    await client.auth().universalAuth.renew();
  }
    
};

export const callInfisical = async<T>(endpoint: string) => {
    const token = infisical.auth().getAccessToken();
    const response = await fetch(new URL(`api/${endpoint}`, siteUrl), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const result = await response.json();
    if (!response.ok) throw new Error((result as Error).message);
    return result as T;
}
export const useInfisical = <T>(endpoint: string) => useFetch(new URL(`api/${endpoint}`, siteUrl).toString(), {
  headers: {
    Authorization: `Bearer ${infisical.auth().getAccessToken()}`
  },
  async parseResponse(response) {
    const result = await response.json();
    if (!response.ok) throw new Error((result as Error).message);
    return result as T;
  },
})