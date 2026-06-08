import { bangumi } from "@/api/bangumi"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"

const tool = async () => {
  const result = await bangumi.getCalendar()
  return result
}

export default withAccessToken(bangumiAuth)(tool)
