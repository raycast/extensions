import { Book, Highlight } from './useApi'

type Context = Book & {
  highlights: Highlight[]
}

type Options = {
  fn: (context: Context) => void
  inverse: (context: Context) => void
}

export function ifeq(this: Context, a: string, b: string, options: Options) {
  return a === b ? options.fn(this) : options.inverse(this)
}
