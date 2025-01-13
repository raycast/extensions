// import { Client } from "@hey-api/client-fetch";
import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
// import { client } from ""

// let canvasClient: Client | null = null;
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Canva",
  providerIcon: "command-icon.png",
  description: "Connect your Canva account",
});

export const provider = new OAuthService({
  client,
  clientId: "OC-AZRfvFkTEJIn",
  authorizeUrl: "https://oauth.raycast.com/v1/authorize/KfxkEVnVQhOizokcb04-EKaPAKBImT78cl5tuuSoOsk-_LIcYYgqsw14jwwePITWdLNJXzzdnrw2cjrGac2ziMcX52EPY0PHIfuwMhpac-23qKQEG6Bjr9NCCSA201M_AohS0Z2KUhuq1RzRsYSOBIdKC5X9gmxbJxQX9ykMlQ",
  tokenUrl: "https://oauth.raycast.com/v1/token/cqnFFrNHb-BGhyQ2gLIiuhvYiLZG1k7rVBdMwCSYqi-sNzLyL4qyI2zfG4C1Ii5STshibpjfWSbs4MrGWYXrRqhq8ajCDL3tQYCl1oPqEzgpkBPSVtCjC0C6_V5W4Nzh6bnUCpu0dqnhpnM7dMfF0y6qF9RMvjI69LwJ-lMHgB3QCGJwqg",
  refreshTokenUrl: "https://oauth.raycast.com/v1/refresh-token/CqVrIjHxutWF0lKItjSiV8cFtJpmIaUSHycfV6fcAdlXf4hjguHd6B-VShdRQqVIg9vHTilan0IWW2_6zyxTrbrBGuCSF31lTVzdyspvGsKKYn7sRJpuqZ_qo8wK3o9Tu-pdSHQxKJ40huuxoVfTtpbxm7o4UohTz1X4akGCCv8pNejLLQ",
  scope: "profile:read",
  bodyEncoding: "url-encoded",
//   onAuthorize({ token }) {
//       canvasClient = new client
//   },
});
