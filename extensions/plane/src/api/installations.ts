import { Configuration, OAuthApi } from "@makeplane/plane-node-sdk";
import { PlaneOAuthAppInstallation } from "@makeplane/plane-node-sdk/dist/oauth/models";
import { getApiBasePath } from "../helpers/urls";

export const getAppInstallations = async ({
  accessToken,
}: {
  accessToken: string;
}): Promise<PlaneOAuthAppInstallation[]> => {
  const config = new Configuration({
    accessToken,
    basePath: getApiBasePath(),
  });
  const oauthApi = new OAuthApi(config);
  const installations = await oauthApi.getAppInstallations(accessToken);
  return installations;
};
