import { transformFullToHalfWidth } from '../fullAndHalfWidthSymbols'
import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSource as rs } from '../regexSource'

// ex: 《Title，contains full-width punctuation》 => 《Title, contains full-width punctuation》
export const use_half_width_punctuation_between_CJK_brackets_if_no_CJK_found: Processor = (input) =>
  input
    .replace(r.rangeOutOf(rs.CJK).repeat().surroundBy('《', '》').$(), (s) => s.replace(/./g, transformFullToHalfWidth))
    .replace(r.rangeOutOf(rs.CJK).repeat().surroundBy('「', '」').$(), (s) => s.replace(/./g, transformFullToHalfWidth))
    .replace(r.rangeOutOf(rs.CJK).repeat().surroundBy('“', '”').$(), (s) => s.replace(/./g, transformFullToHalfWidth))
