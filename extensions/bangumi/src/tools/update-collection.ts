import { Tool } from "@raycast/api"
import { bangumi } from "@/api/bangumi"
import { getCollectionTag } from "@/const"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"

type Input = {
  /**
   * The ID of the subject to update. This is a required number.
   */
  subjectId: number

  /**
   * The new collection status for the subject.
   * 1 = Wish (想看/想玩), 2 = Collect (已看/玩过), 3 = Doing (在看/在追/在玩), 4 = OnHold (搁置), 5 = Dropped (抛弃)
   */
  collectionType: number

  /**
   * Name of the subject (for display purposes in the confirmation prompt).
   */
  subjectName?: string
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const statusName = getCollectionTag(input.collectionType).value
  const displayName = input.subjectName || String(input.subjectId)
  return {
    message: `Are you sure you want to update the collection status of "${displayName}" to "${statusName}"?`,
  }
}

const tool = async (input: Input) => {
  await bangumi.updateSubjectCollection(input.subjectId, input.collectionType)

  const statusName = getCollectionTag(input.collectionType).value
  return {
    success: true,
    message: `Successfully updated subject ${input.subjectId} collection status to "${statusName}"`,
  }
}

export default withAccessToken(bangumiAuth)(tool)
