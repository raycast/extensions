import { bangumi } from "@/api/bangumi"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"

type Input = {
  /**
   * The ID of the subject to fetch details for.
   */
  subjectId: number
}

const tool = async (input: Input) => {
  const result = await bangumi.getSubjectById(input.subjectId)
  return result
}

export default withAccessToken(bangumiAuth)(tool)
