import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'
import { regexSourceRanges as rsr } from '../regexSource'

// ex: Fine.Thank you. => Fine. Thank you.
// ex: Tim:Hello => Tim: Hello
export const ensure_space_after_some_half_width_punctuations: Processor = (input) =>
  input.replace(r.of(`[a-z][!?.,:]`).wrap().then(`${rsr.space}*`).then(`([a-zA-Z0-9])`).$(), '$1 $2')
