import { withAccessToken } from "@raycast/utils"
import { formatCharacterToMarkdown } from "./utils"
import { bangumi, bangumiAuth } from "@/api"

type Input = {
  /**
   * The keyword to search for characters.
   */
  keyword: string

  /** Limit of items to return, default 10, max to 20 */
  limit?: number

  /** Offset, default 0 */
  offset?: number
}

const tool = async (input: Input) => {
  const { total, limit, offset, data } = await bangumi.searchCharacters({
    keyword: input.keyword,
    limit: input.limit || 10,
    offset: input.offset || 0,
  })

  const items = data.map(formatCharacterToMarkdown).join("\n\n") || "No characters found."

  return {
    pagination: {
      total,
      limit,
      offset,
    },
    content: `# Character Search Results for "${input.keyword}"\n\n${items}`,
  }
}

export default withAccessToken(bangumiAuth)(tool)
