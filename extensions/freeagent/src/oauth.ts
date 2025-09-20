import { OAuth } from "@raycast/api";
import { OAuthService, withAccessToken } from "@raycast/utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "FreeAgent",
  providerIcon: "icon.png",
  description: "Connect your FreeAgent account to manage invoices and access your data.",
});

export const provider = new OAuthService({
  client,
  clientId: "1gboRls5p9y6OnBT8m1Y_A",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/PLlKWDuFWQjTTgdJHUy-wK47_zN8lc2ATzyvHJSoNy5WazXXYTG_h8Yz1eOPwlUvB-YNQos46o_9lgTxwUdQN3L9P4LsjYwgitMYkEmcHtGHsUyZYyBXwng3lgE",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/csqaHeGaTfTpistIum6eBy7DDrJjcz7Z-FmW_HuU4Dsa3r-AhgMCGcEWYUCLR3k-5-PirrX1ilceu4WfRqUQlyCSEiYqzkZkIIKyx5n7khRbIe99FHiEBtENFXUZRz8",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/wg1eYlPV441y6BfHcmZi19x61W2tqw045Dup4C6M8VgERbxtFByj1J97OeYVaiPHbYWoLz3nNnZ3nzXoMnZbqP6EhVYkT8eJefM79ey5sQLcdRL9vGnlBsLMqaB_Ylg",
  scope: "read write",
});

export const authorizedWithFreeAgent = withAccessToken(provider);
