import { getAllHalfWidthForms } from '../fullAndHalfWidthSymbols'
import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'

// ex: A&B => A & B
// ex: A&&B => A && B
export const ensure_space_around_some_half_width_punctuations: Processor = (input) =>
  input
    .replace(
      r
        .rangeOf('&')
        .wrap()
        .before(r.rangeOutOf(getAllHalfWidthForms() + '\\s')._())
        .$(),
      '$1 '
    )
    .replace(
      r
        .rangeOf('&')
        .wrap()
        .after(r.rangeOutOf(getAllHalfWidthForms() + '\\s')._())
        .$(),
      ' $1'
    )
