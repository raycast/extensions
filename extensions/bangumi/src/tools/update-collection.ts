import { Tool } from "@raycast/api"
import { getCollectionTag } from "@/shared/utils"
import { withAccessToken } from "@raycast/utils"
import { bangumi, bangumiAuth } from "@/api"

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

  /**
   * The subject type. Used to pick the right verb (e.g. "Reading" for books vs "Watching" for anime).
   * 1 = Book, 2 = Anime, 3 = Music, 4 = Game, 6 = Real
   */
  subjectType?: number
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const statusName = getCollectionTag(input.collectionType, input.subjectType).value
  const displayName = input.subjectName || String(input.subjectId)
  return {
    message: `Are you sure you want to update the collection status of "${displayName}" to "${statusName}"?`,
  }
}

const tool = async (input: Input) => {
  await bangumi.updateSubjectCollection({ subjectId: input.subjectId, type: input.collectionType })

  const statusName = getCollectionTag(input.collectionType, input.subjectType).value
  return {
    success: true,
    message: `Successfully updated subject ${input.subjectId} collection status to "${statusName}"`,
  }
}

export default withAccessToken(bangumiAuth)(tool)
