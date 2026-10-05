import { withAccessToken } from "@raycast/utils"
import { formatSubjectToMarkdown } from "./utils"
import { bangumi, bangumiAuth } from "@/api"

type Input = {
  /**
   * The keyword to search for (e.g., name of the anime, game, or book).
   */
  keyword: string

  /**
   * Type of subject to filter. If not provided, it will return all types.
   * 1 = Book (书籍), 2 = Anime (动画/番剧), 3 = Music (音乐), 4 = Game (游戏), 6 = Real (三次元)
   */
  subjectType?: number

  /** Limit of items to return, default 10, max to 20 */
  limit?: number

  /** Offset, default 0 */
  offset?: number
}

const tool = async (input: Input) => {
  const { total, limit, offset, data } = await bangumi.searchSubjects({
    keyword: input.keyword,
    limit: input.limit || 10,
    offset: input.offset || 0,
    subjectType: input.subjectType,
  })

  const items = data.map(formatSubjectToMarkdown).join("\n\n") || "No results found."

  return {
    pagination: {
      total,
      limit,
      offset,
    },
    content: `# Search Results for "${input.keyword}"\n\n${items}`,
  }
}

export default withAccessToken(bangumiAuth)(tool)
