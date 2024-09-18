import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Figma",
  providerIcon: "command-icon.png",
  description: "Connect your Figma account",
});

const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues<Preferences>();

export const figma = new OAuthService({
  client,
  clientId: "dkY6v4uzFHoH4RaK7mB7Uw",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/_ege2-Xu_rzO6XIRwPi7Mnne6GARpdRe1I1IAf6ralbKRJjaByWNHIEK4e5ESizgQ_Z2B526iMt1KdooGAMIrAjVvIHgnhTcQziAP_CgEkzYzAHUJRPw",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/qTlHR2nhUt2e07Ynlbw-T4ALSoDPrGnUZU4z1VsH-scRq-We8cI9RfPKJb9UfEau0bCVYIc0qtW5fOVJ0rtUwDN6KSg5d8XgR_wRofMYARLRzAWhTb5mFsXTdFZl3GPQfA",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/HoH9ux_TZ_15D9D2btgNZHFDsQtYmSFRQKBCeI4XodDg6svGnR7l7hQaSAV9XY95lD9YzMTPcucjZyHCzoGOHRerqbWB1WAJjpjEDPpwkM5Jg2YCIF-fUcv7VFBepLxT5M9iv",
  scope: "files:read",
  personalAccessToken: PERSONAL_ACCESS_TOKEN,
});
