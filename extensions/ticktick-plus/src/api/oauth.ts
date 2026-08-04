import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "TickTick",
  providerIcon: "tick-logo.png",
  description: "Connect your TickTick account to get started.",
});

export const provider = new OAuthService({
  client,
  clientId: "unQCVQ2ktZ1Mn1I0u4",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/mgIpKnxTo3jdnE1IUETN_zw4tSRTSnH6DffToE_gh1deVyanGQ53X1ZN8QrZtl8XgYkARnurl9iQVFtuOvNYPMmaEtZoY05ZV7KmAF4GE2NNmlJScX8Hd3_RRm054E_hRus",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/SXhT3SrBQS_UHzaHXdkI28IHvtPy1y79lN5b7WoFnWn6gbvztRZkAL906CUce9e4DbOLgWxhVLCG_Bxi0Ur3d4H7bBprZDsofulVmBBdNJgrF1mH-b2iJRDck9uLWA",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/sZgB0AoTB26kqAhJ7pKwC-c0Csk7iMGAQ3OwBADMcZd0ntppCz-q3tTb4VRgutPDL-JiXn4JbkrkCggRXIlO5mQp7VJvLO7XuPxJ2oqLO7dJPEziEKzsKHEeMRgfGw",
  scope: "tasks:read tasks:write",
  // TickTick access tokens are long-lived (~180 days) but its refresh-token grant is
  // unreliable and often returns `invalid_grant`. Any small/zero/missing `expires_in`
  // would make OAuthService refresh prematurely and bounce the user back to sign-in.
  // Always stamp a long expiry so we treat the access token as long-lived and let a real
  // API 401 (handled in client.ts) be the only trigger for re-authentication.
  tokenResponseParser: (response) => {
    const r = response as OAuth.TokenResponse & { expires_in?: number };
    return { ...r, expires_in: 60 * 60 * 24 * 180 };
  },
});

export async function authorize(): Promise<string> {
  return provider.authorize();
}
