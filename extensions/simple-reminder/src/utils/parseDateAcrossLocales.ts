import * as chrono from "chrono-node";

const SUPPORTED_LOCALES = ["en", "de", "fr", "es", "nl", "pt", "ja", "zh", "ru"] as const;

type LocaleParseResult = {
  date: Date;
  matchedText: string;
  index: number;
};

export function parseDateAcrossLocales(inputText: string, referenceDate: Date): LocaleParseResult | null {
  let best: LocaleParseResult | null = null;

  for (const locale of SUPPORTED_LOCALES) {
    // Note: passing `forwardDate` here shrinks the matched text span for some
    // parsers (e.g. it drops the leading "in" from "in two hours"), so the
    // matched span is read from a plain parse and the forward-looking date
    // value is resolved separately below.
    const [result] = chrono[locale].parse(inputText, referenceDate);
    if (!result) continue;
    if (best && result.text.length <= best.matchedText.length) continue;

    const date = chrono[locale].parseDate(inputText, referenceDate, { forwardDate: true });
    if (!date) continue;

    best = { date, matchedText: result.text, index: result.index };
  }

  return best;
}
