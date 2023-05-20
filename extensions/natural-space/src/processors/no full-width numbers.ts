import { transformFullToHalfWidth } from '../fullAndHalfWidthSymbols'
import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSourceRanges as rsr } from '../regexSource'

export const no_full_width_numbers: Processor = (input) =>
  input.replace(r.of(rsr.fullWidthChars).$(), transformFullToHalfWidth)
