/**
 * Offline paragraph restoration for a genuine wall of text.
 *
 * An earlier version of the offline engine broke every third sentence, which
 * destroyed structure that was already correct. The lesson from that was not
 * "never break" — it was "never break blind". So this module does two things
 * differently: it only runs when the text has no structure left to protect,
 * and it breaks on actual linguistic cues rather than a sentence counter.
 *
 * Wording is never altered. The only edits are inserted newlines.
 */

/** Sentence-initial phrases that reliably start a new thought. */
const TRANSITIONS = [
  "However",
  "That said",
  "Still",
  "Also",
  "Additionally",
  "Moreover",
  "Furthermore",
  "Meanwhile",
  "Separately",
  "In short",
  "In summary",
  "Net",
  "Overall",
  "Finally",
  "Lastly",
  "First",
  "Second",
  "Third",
  "Next",
  "On the other hand",
  "To be clear",
  "For context",
  "One more thing",
  "Two things",
  "Three things",
  "A few things",
  "Bottom line",
  "Worth noting",
  "Heads up",
  "Quick note",
  "My take",
  "The problem",
  "The issue",
  "The fix",
  "The good news",
  "The bad news",
  "Either way",
  "Long story short",
];

const GREETING = /^((?:Hi|Hey|Hello|Dear|Good morning|Good afternoon|Good evening)\b[^,.!?]{0,40}),\s*/;

/**
 * A sign-off is the whole sentence: the closing word, optionally a comma, and
 * optionally a name. Matching the cue alone would misread an opening line like
 * "thanks for sending the deck over" as the end of the email, so everything
 * after the cue must be punctuation or capitalized name words.
 */
const SIGN_OFF =
  /^(Best regards|Kind regards|All the best|Best|Thanks again|Thanks so much|Thank you|Thanks|Cheers|Regards|Sincerely|Talk soon|Speak soon)\b[,!.]?(\s+[A-Z][\w'’-]*){0,3}\s*[.!]?$/i;

/**
 * True when the text is a single undifferentiated block — i.e. there is nothing
 * structural left for us to preserve, so inserting breaks cannot destroy
 * anything the author intended.
 */
function isWallOfText(text: string): boolean {
  if (/\n\s*\n/.test(text)) return false; // already has paragraphs
  if (/^\s*(?:[-*+]|\d+[.)]|#{1,6}\s|>)/m.test(text)) return false; // lists, headings, quotes
  const newlines = (text.match(/\n/g) ?? []).length;
  if (newlines > 2) return false; // author already used line breaks deliberately
  return text.trim().length > 180 && countSentences(text) >= 4;
}

function countSentences(text: string): number {
  return splitSentences(text).length;
}

/**
 * Split on sentence boundaries. Abbreviations are masked by the caller in
 * offlineFormat, so a period here is a real terminator.
 */
function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 0);
}

function startsNewThought(sentence: string): boolean {
  return TRANSITIONS.some((cue) => {
    // Require the cue to be followed by a boundary so "Firstly" doesn't match
    // "First" and "Nettle" doesn't match "Net".
    const re = new RegExp(`^${cue.replace(/ /g, "\\s+")}\\b[\\s,:]`, "i");
    return re.test(sentence);
  });
}

/**
 * Restore paragraph breaks in a wall of text. Returns the input untouched when
 * it already has structure worth keeping.
 */
export function restoreParagraphs(text: string): string {
  if (!isWallOfText(text)) return text;

  let body = text.replace(/\s+/g, " ").trim();
  const paragraphs: string[] = [];

  // A greeting is glued to the first sentence by a comma ("Hi Sarah, thanks
  // for..."), so peel it off before sentence splitting sees it.
  const greeting = body.match(GREETING);
  if (greeting) {
    paragraphs.push(`${greeting[1]},`);
    body = body.slice(greeting[0].length);
  }

  const sentences = splitSentences(body);
  let current: string[] = [];

  const flush = () => {
    if (current.length) {
      paragraphs.push(current.join(" "));
      current = [];
    }
  };

  for (const sentence of sentences) {
    // A sign-off ends the body; it and anything after it stand alone.
    if (SIGN_OFF.test(sentence)) {
      flush();
      // "Best, Dakota" reads as two lines, not one.
      paragraphs.push(sentence.replace(/^([A-Za-z][A-Za-z\s]*?),\s*/, "$1,\n"));
      continue;
    }

    if (current.length && startsNewThought(sentence)) flush();
    current.push(sentence);

    // Safety valve: a long run with no cue at all still shouldn't stay a wall.
    // Five sentences is deliberately looser than the old every-third chop.
    if (current.length >= 5) flush();
  }
  flush();

  return paragraphs.filter((p) => p.trim().length > 0).join("\n\n");
}
