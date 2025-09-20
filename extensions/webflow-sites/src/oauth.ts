import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { WebflowClient } from "webflow-api";
import "cross-fetch/polyfill";

let webflowClient: WebflowClient | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Webflow",
  providerIcon: "webflow-logo.png",
  providerId: "webflow",
  description: "Connect your Webflow account",
});

export const provider = new OAuthService({
  client,
  clientId: "f064d8bd2157f5c690a436af38a85fe627dfe89d12df1240d9ffb8f92c56c29a",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/SpqHimJblCsEsHMaOX6bSCGCatuNIU9D8vHt3qn0eGhM9Dhqs-K2TDWF2KFer-G-LizUGpxKDwkTBA-oGVs9yAJzI-GsWPkS3UTCbil0P5rY5VxHVic2kuBzEaQan7HBhfvFHLwOYnbd69mx0blWKqXxgWW7sZ3FqagkphxttM0n",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/q4QKZun0V_mQeHqwiKbrv-G8fdDGM1-an2xu3vMO5AqrmUHnzIC4pjEpHf_I2XWtpR3uMK42EtKQiqNljaEE3rtacJnOHrip0_2B4K7Ci3WClmnjzv9gwmyYtmaGl4qIeU10j2RTDWVRq_jeUwc5Ze2_RCwYWdikkqKsfiLkJWZVahPvI0-RaA",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/OUvaPcCuUx4pAsmO9NlL0SjzRIsj1iquQtVbDxZlJHw5AxRqpEykQrSAKVa13YZNyTulfh8hUtGnOsmNEdMCyvflcIegE6MhbCr5BYS9Zdznb95mcJiXhduhwmXr9OXV6srwF4DmOUEnVwMzH7Pv8i8KmFxRRjbmm9rku70X_yNeVIxu9bzKzg",
  scope: "sites:read assets:read",
  onAuthorize({ token }) {
    webflowClient = new WebflowClient({ accessToken: token });
  },
});

export function getWebflowClient() {
  if (!webflowClient) throw new Error("Webflow not initialized");
  return webflowClient;
}
