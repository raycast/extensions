import { bangumi } from "@/api/bangumi"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"

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

  /** Limit of items to return, default 10 */
  limit?: number

  /** Offset, default 0 */
  offset?: number
}

const tool = async (input: Input) => {
  const result = await bangumi.searchSubjects(input.keyword, input.limit || 10, input.offset || 0, input.subjectType)

  return result
}

export default withAccessToken(bangumiAuth)(tool)
