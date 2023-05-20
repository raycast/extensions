import { getAllFullWidthForms, halfToFullWidthMap, transformHalfToFullWidth } from '../fullAndHalfWidthSymbols'
import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSource as rs } from '../regexSource'

// ex: 你好,Tim => 你好，Tim
// NOT vice versa. CJK is pollutive to punctuation.
export const use_full_width_punctuation_around_CJK_characters: Processor = (input) =>
  input.replace(
    r
      .rangeOf(Object.keys(halfToFullWidthMap).join(''))
      .after(`[${rs.CJK}${getAllFullWidthForms()}]`)
      .or(r.rangeOf(Object.keys(halfToFullWidthMap).join('')).before(`[${rs.CJK}${getAllFullWidthForms()}]`)._())
      .$(),
    transformHalfToFullWidth
  )
