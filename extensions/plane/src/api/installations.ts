import { Configuration, OAuthApi } from "@makeplane/plane-node-sdk";
import { getPreferenceValues } from "@raycast/api";
import { PlaneOAuthAppInstallation } from "@makeplane/plane-node-sdk/dist/oauth/models";

const preferences = getPreferenceValues();

export const getAppInstallations = async ({
  accessToken,
}: {
  accessToken: string;
}): Promise<PlaneOAuthAppInstallation[]> => {
  const config = new Configuration({
    accessToken,
    basePath: preferences.API_BASE_PATH,
  });
  const oauthApi = new OAuthApi(config);
  const installations = await oauthApi.getAppInstallations(accessToken);
  return installations;
};
