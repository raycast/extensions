import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSourceRanges as rsr } from '../regexSource'

// ex: 123% => 123%
// ex: 34GB => 34 GB
export const ensure_space_between_numbers_and_units_exclude_exceptions: Processor = (input) =>
  input
    .replace(r.of('[0-9]').wrap().before('[a-zA-Z_]').$(), '$1 ')
    .replace(r.of('[0-9]').wrap().then(`${rsr.space}+`).before(rsr.units).$(), '$1')
