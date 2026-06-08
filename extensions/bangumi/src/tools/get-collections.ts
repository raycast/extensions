import { bangumi } from "@/api/bangumi"
import { withAccessToken } from "@raycast/utils"
import { bangumiAuth } from "@/api/oauth"

type Input = {
  /**
   * Type of subject to filter. If not provided, it will return all types.
   * 1 = Book (书籍), 2 = Anime (动画/番剧), 3 = Music (音乐), 4 = Game (游戏), 6 = Real (三次元)
   */
  subjectType?: number

  /**
   * Type of collection status to filter. If not provided, it returns all collections.
   * 1 = Wish (想看/想玩), 2 = Collect (已看/玩过), 3 = Doing (在看/在追/在玩), 4 = OnHold (搁置), 5 = Dropped (抛弃)
   */
  collectionType?: number

  /** Limit of items to return, default 30 */
  limit?: number

  /** Offset, default 0 */
  offset?: number
}

const tool = async (input: Input) => {
  const result = await bangumi.getMyCollections({
    subject_type: input.subjectType,
    type: input.collectionType,
    limit: input.limit || 30,
    offset: input.offset || 0,
  })

  return result
}
export default withAccessToken(bangumiAuth)(tool)
