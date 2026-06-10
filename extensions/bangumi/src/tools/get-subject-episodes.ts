import { bangumi } from "@/api/bangumi"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"
import { formatEpisodeToMarkdown } from "./utils"

type Input = {
  /**
   * The ID of the subject to fetch episodes for.
   */
  subjectId: number

  /**
   * Type of episode to filter. If not provided, it will return all types.
   * 0 = Main (本篇), 1 = SP (特别篇), 2 = OP, 3 = ED, 4 = Trailer (预告), 5 = MAD, 6 = Other (其他)
   */
  episodeType?: number

  /** Limit of items to return, default 100 */
  limit?: number

  /** Offset, default 0 */
  offset?: number
}

const tool = async (input: Input) => {
  const result = await bangumi.getUserSubjectEpisodeCollection({
    subjectId: input.subjectId,
    query: {
      limit: input.limit || 100,
      offset: input.offset || 0,
      episode_type: input.episodeType,
    },
  })

  const items =
    result.data
      ?.map((ep) => {
        const epMd = formatEpisodeToMarkdown(ep.episode)
        const typeStr = ep.type === 1 ? "Wish" : ep.type === 2 ? "Watched" : ep.type === 3 ? "Drop" : "None"
        return `${epMd}\n    - User Status: ${typeStr}`
      })
      .join("\n") || "No episodes found."

  return {
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    },
    content: `# Subject Episodes (Subject ID: ${input.subjectId})\n\n${items}`,
  }
}

export default withAccessToken(bangumiAuth)(tool)
