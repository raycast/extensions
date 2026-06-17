import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "42",
  providerIcon: "41.png",
  description: "Connect your 42 account",
});

// The 42 OAuth app must use https://oauth.raycast.com/redirect as its redirect URI.
export const provider = new OAuthService({
  client,
  clientId: "u-s4t2ud-f7e18951889c9f054d2bc27ea1caa76b20c0388a08f78514b6458375583bc708",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/MnlQFVxIGQ4k6vhqj0q7FUyjXQs7FbP504oq2kWvU0DQ7ydArhDDZo_0RZLytPp3cBI4XAAi6JhEM4dq3POHTarPLiM-OJScM_6D1S3WCTynD_ArEsOIIihJC7KQvZL3X5vaDaKBygzemteTqVfTT3mxFpHXRwDMaMwKrSBimszqxqSJre9Cm_rkaA4ovOKh9A",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/CQ8Acmd1GJ7WXGwXJ0BdBOtMhyiGcdZMPpq7pnM74LNkLiB6gRMSJ33oMtJ0bGkKFlG3IitUPqnW89BL8_VQ6t6Vex1Znps-pAd0itvAr1q0VaawTwfopc43vp-soOvKY9A1U8dfeKGOh9iDyGWrN-_NsDEO-UcJTazwwIBaPo1hRX4kdlHWRueDTrXS",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/3M-j9Q4RZaZelFapmWrXeGPyaVV2zce7OIBsa7_8yMZ-Z-wH0UnsPVvGlNwo3n8IBZs-dEyVDLVusP6hjYD4seIut6Jv24LtdvogyEDNcuRpOmyb6DEX-hnvnT56MH47XJ-aNiCWAJC4SIn3WeMA7T-wdlbsuxWvHA1Aw7IyA5jNLwTyALavTOnrY69W",
  scope: "public profile",
});

let authorizePromise: Promise<string> | undefined;

function authorizeOnce(): Promise<string> {
  authorizePromise ??= provider.authorize().finally(() => {
    authorizePromise = undefined;
  });

  return authorizePromise;
}

export async function ensureAuthenticated(): Promise<string> {
  const token = await authorizeOnce();
  return token;
}
