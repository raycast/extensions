import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"
import MyCollection from "@/components/MyCollection"

const Command = () => <MyCollection />

export default withAccessToken(bangumiAuth)(Command)
