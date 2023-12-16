import { $, ProcessOutput } from "zx";

export function $withoutEscaping(pieces: TemplateStringsArray, ...args: unknown[]): Promise<ProcessOutput> {
  const origQuote = $.quote;
  try {
    $.quote = (unescapedCmd) => unescapedCmd;
    return $(pieces, args);
  } finally {
    $.quote = origQuote;
  }
}
