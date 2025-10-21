import { LocalStorage, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { PlaneClient } from "./client";
import { STORAGE_WORKSPACE_SLUG_KEY } from "../helpers/keys";
import { getAppInstallations } from "./installations";

let planeClient: PlaneClient | undefined;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Plane",
  providerIcon: "plane-icon.png",
  providerId: "plane",
  description: "Connect your Plane account",
});

const plane = new OAuthService({
  client,
  clientId: "CcWYeOV3L3Q05jIpB4w6xaJx8QW8AovL0fV4TnLd",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/dAAojlwLRis2jBTlrt8vrrmmaMYGJO0ZuPZb8awD6ouUaNVltt_bEeZACr4zFPcHvV0U5IVaAabS3IWAn0R-JN1vvk1g5WqXSrYpyH9SQAXQ2-nquGy9KhyrfKd8JnnBFC0kMLzniS13BIrr0F9mbrSMZuhXITeAlgHSnlJcqHBw7MMYbLNfwbMbeHPofwDPbroIsU1l8VVPQpu3Xba8L0jy6rBAQeczGhi0ghcoEfeuogNd5r3CRyU9WgCGoB3e7VqNvWNk5e0",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/9KXLatvC9QrbuSafABDqcnA8IZW-JXwd4FF4CvZ-C6LFXfbl8FONXyjGuaO1n2XEFIW6bvDFFWDKH5IB_9gupDVVPiAHt5_mNmQJTQ_OmF7AYcKe6fF3I13O_hYIOETpCPknFn9ww9arA93J2knoGIWRSE-FFoVB2_lBGL8xP8FaRaj8_S6M-fsKUOg1YyyOFaK6dIIN5LF8i6P5J8y_L8Q6hWu4ZyyxmLCKHmEyPY9uoK-6ZZ27W0LMIrNzSHTS",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/dERRhlRqcHTtXPJLaZZqs7h8JYsRPZrQeWpVvNN_5F9qd_Z6Hb1q6xr_iVeLUmKBj9Ewk3xHAuADSKCpQ1fb0rJq07vziFLkate0VW2zkV0a-xfj23KBoVM2y50aA4geUo7XQT4PS0MKFBIt44ZaD0QRnr3gdZIf37xWollM66pK35YAmuIgo4uFDFJnj1-A1zJ8FvuYL16tHK5qO4nK6SBKE-AktYpraqpziJUINAwN6ByKe_JO1MdvtGGeMb-5",
  scope: "read write",
  onAuthorize: async ({ token }) => {
    const tokenKey = STORAGE_WORKSPACE_SLUG_KEY(token);
    let workspaceSlug = await LocalStorage.getItem(tokenKey);
    if (!workspaceSlug) {
      const installations = await getAppInstallations({ accessToken: token });
      workspaceSlug = installations[0].workspace_detail.slug;
      await LocalStorage.setItem(tokenKey, workspaceSlug);
    }
    planeClient = new PlaneClient(token, workspaceSlug?.toString());
  },
});

export { plane };
export { planeClient };
