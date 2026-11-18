import { OAuth, getPreferenceValues } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const { api_key } = getPreferenceValues<ExtensionPreferences>();

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Publora",
  providerIcon: "publora_512x512.png",
  description: "Connect your Publora account",
});

export const publora = new OAuthService({
  client,
  clientId:
    "idwU2ktUEWG3AAn9g37oQ5FheTxa94oO2BDnxFUwFLEHg_2WKQA7JjdCw_xPyLcd7gRhk4chlBdytNA_4gFYOA6A9zFR0V7VSEkwS3xBXiwGVnpaC-OnpKU1VS2ipaYqm_hZGHp8fxhNBBKUtT_vglICxOm3j0rhX9q1cWBA7Y6D1FDtdxrP5UON8zqGomo8NPUfzhqcLYXImoPRno_yAg",
  scope: "",
  authorizeUrl: "https://mcp.publora.com/authorize",
  tokenUrl: "https://mcp.publora.com/token",
  refreshTokenUrl: "https://mcp.publora.com/token",
  bodyEncoding: "url-encoded",
  personalAccessToken: api_key || undefined,
});
