import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'

export const no_duplicated_whitespace_except_leading_and_trailing_ones: Processor = (input) =>
  input.replace(r.of(' +').after('\\S').before('\\S').$(), ' ')
