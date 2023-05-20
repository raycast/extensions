import { Processor } from '../orderedProcessor'
import { regex as r } from '../regex'

// ex: A(Apple) => A (Apple)
export const ensure_space_before_left_brackets: Processor = (input) =>
  input.replace(r.of('[(]').after('[^ ]').$(), ' (')
