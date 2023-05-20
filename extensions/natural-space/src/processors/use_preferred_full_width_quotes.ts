import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'

// ex: 「你好 Tim」 <=> “你好 Tim”
export const use_preferred_full_width_quotes: Processor = (input, { useStraightQuotesForCJK }) =>
  useStraightQuotesForCJK
    ? input.replace(r.of('“([^”]*?)”').$(), '「$1」')
    : input.replace(r.of('「([^」]*?)」').$(), '“$1”')
