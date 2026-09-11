import { OAuth } from "@raycast/api"
import { OAuthService } from "@raycast/utils"

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Bangumi",
  providerIcon: "extension-icon.png",
  description: "Connect your Bangumi account",
})

type BangumiTokenResponse = Omit<OAuth.TokenResponse, "scope"> & {
  scope: string | null
  user_id?: number
}

export const bangumiAuth = new OAuthService({
  client,
  clientId: "bgm62976a25c521a8187",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/nAxnz5SEQ7fO5SRxM_DjKrJ4k3C00kfJCNh1-fp_ZcDFXVcYIxtPBI5BbGux3-EOO8WfSheAkSZ7EJRtTfq1EQkaxB4ZKpkJ9byrPZZfYMx35C1Ii85HfKYDVo4",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/7CSgIYGNn4jFuD6fTG5ov64wsfsi3iegonKLu0FCzW4pWL1T1jgXa4Bxa4f5w-bZOModMtBbrKFPsx1bGT4LUL_pmFzC1O3PkRp4Al1FToLwL_OPG4wVCAnQBQv6d2A",
  scope: "",
  tokenResponseParser: (response) => {
    const data = response as BangumiTokenResponse
    return {
      ...data,
      scope: data.scope || "",
    }
  },
})
