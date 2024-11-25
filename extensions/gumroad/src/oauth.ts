import { getPreferenceValues, OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

const { token } = getPreferenceValues<Preferences>();

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Gumroad",
  providerIcon: "icon.png",
  description: "Connect your Gumroad account",
});

export const provider = new OAuthService({
  client,
  clientId: "xuBHbFpfUORbVHweFT6N2kQzCEJX3BaRT2SmcaPB8w4",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/6u4QNlwsUEvYJiwlmx-jGSBLpe0QloUowsc9PMy64xyP31e0kMWtiJCyTz4b_9EPuycLxrAIvZfFtVczX9fPJfU5Xt5h2ib3aZRDa85rRqQbFe1hqyVXIQdIPXo2mZdkSp9N7P2pFtAeykI3",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/cAfVd74pOuU0WIWMymDxtIHXg2c1Hai7gBXmE4DZGFk4tRZczsTQlJzrFzbwSYE3TmlIEse4FP4uUy9EYX35zYfsI0_2mfKmLudJ4wsC-8zUsEXhJwnIn11TJmNeH2bpiWxqQpU-K4Q",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/-8K39Rwy5HY5-DzNTOVLTMvKH6EQVd5E50z9mvLJ4bahXJu2susPq_DcGFFUYrhctLgTTXZLhmYRvlBnpIaGuxPDB7QTscbBrsz63tOA4RvPXoqJYh4JKtyUgQMAheFWBKh6gvNI08Q",
  scope: "view_profile view_sales",
  personalAccessToken: token,
});
