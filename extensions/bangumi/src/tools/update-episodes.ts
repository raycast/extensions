import { Tool } from "@raycast/api"
import { bangumi } from "@/api/bangumi"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"

type Input = {
  /**
   * The ID of the subject.
   */
  subjectId: number

  /**
   * Array of episode IDs to update.
   */
  episodeIds: number[]

  /**
   * Status to set for the episodes.
   * 0 = NotCollected (撤销), 1 = Wish (想看), 2 = Watched (看过), 3 = Dropped (抛弃)
   */
  collectionType: number

  /**
   * Name of the subject (for display purposes in the confirmation prompt).
   */
  subjectName?: string
}

const episodeCollectionTypeMap: Record<number, string> = {
  0: "NotCollected",
  1: "Wish",
  2: "Watched",
  3: "Dropped",
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const statusName = episodeCollectionTypeMap[input.collectionType] || input.collectionType.toString()
  const displayName = input.subjectName || String(input.subjectId)
  return {
    message: `Are you sure you want to update ${input.episodeIds.length} episode(s) of "${displayName}" to "${statusName}"?`,
  }
}

const tool = async (input: Input) => {
  if (input.episodeIds.length === 0) {
    throw new Error("No episode IDs provided")
  }

  await bangumi.updateSubjectEpisodesCollection({
    subjectId: input.subjectId,
    episodeIds: input.episodeIds,
    type: input.collectionType,
  })

  const statusName = episodeCollectionTypeMap[input.collectionType] || input.collectionType.toString()
  return {
    success: true,
    message: `Successfully updated ${input.episodeIds.length} episode(s) of subject ${input.subjectId} to "${statusName}"`,
  }
}

export default withAccessToken(bangumiAuth)(tool)
