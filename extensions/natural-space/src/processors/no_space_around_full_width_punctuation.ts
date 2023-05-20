import { getAllFullWidthForms } from '../fullAndHalfWidthSymbols'
import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSourceRanges as rsr } from '../regexSource'

// ex: 你好， Tim => 你好，Tim
// ex: Tim ，再见 => Tim，再见
export const no_space_around_full_width_punctuation: Processor = (input) =>
  input.replace(
    r
      .rangeOf(getAllFullWidthForms())
      .wrap()
      .between(rsr.space + '*', rsr.space + '*')
      .$(),
    '$1'
  )
