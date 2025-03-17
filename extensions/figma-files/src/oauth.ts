import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Figma",
  providerIcon: "command-icon.png",
  description: "Connect your Figma account",
});

const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues();

export const figma = new OAuthService({
  client,
  clientId: "dkY6v4uzFHoH4RaK7mB7Uw",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/F7SnNEtLc3w2AFfhwdtXwpE-rW2l2OOtG3h0z76VKM6YJVtkU17gAmgJgqzIn6lO3X9SCv_iv3_3BS8a1Jq0gc14HUxILPg8wQNB8zBaX4-OjUj2ixG0",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/rsuQtsavqnjuxmA3vCYSGa3E-D8_ruhzY4OqJIOA7aB4_wGaFh2WE0mQc_uMZ7E5Nk8-pAeW3JXE3WlUfgqu_-zNiM4yWU7i_z2-u0pO8HJFh7_H6ohVBh8fcDpk64nT",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/qJfyXOqhjDouaj06_54vl2O3NoIfY36R_-OOExXZNAS073Bih0aeNaHLO9xEpW6lbooqWCpT6zO7zLvbTx1MtXF2dU5d4B_of5d05Yxh27JIAPHG0uBw7fINhej_ViQ-sbE",
  scope: "files:read",
  personalAccessToken: PERSONAL_ACCESS_TOKEN,
});
