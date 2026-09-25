/**
 * Making something of the `syllabus` field, which the search response has been carrying all along.
 *
 * CourtListener documents it as "a summary of the issues presented in the case and the outcome",
 * and documents nothing about how often it is filled in or what tends to be in it. Sampling a
 * hundred results found one on a little over half of them, holding two quite different things.
 * Some courts file a written summary — "The plaintiffs sought to recover damages from the
 * defendant insurance companies… in connection with the denial of the plaintiffs' claim under a
 * homeowners insurance policy" — and some file the line of their subject index instead: "Fourth
 * Amendment; Search; Probable Cause; Marijuana; Hemp; Motion to Suppress; Reversed." The second
 * kind is worth nothing next to the result it sits under, whose court and case name already say
 * as much, so only the first is shown.
 */

import { toMarkdown } from "./highlight";

/**
 * Words that hold a sentence together and are absent from a list of topics. Sentence punctuation
 * can't do this job: legal prose and legal keyword lists are both dense with abbreviations, so
 * "State v. Cutlip, 7th Dist. Belmont No. 21 BE 0032" reads as four sentences to a regex.
 */
const FUNCTION_WORDS = new Set(
  "a after an and are as be been but by for from had has have he held her his in is it its not of on that the their then there they this to was were when which who with".split(
    " ",
  ),
);

/**
 * Both thresholds are needed, and both were set by sampling a hundred results. Ratio alone admits
 * short headings that happen to be phrased — "Fourth Amendment Search and Seizure and Consent to
 * Search." runs to 0.33 on the strength of two "and"s — and length alone admits the long keyword
 * runs that some state courts file, which go on for several hundred characters without a verb.
 */
const MIN_LENGTH = 200;
const MIN_FUNCTION_WORD_RATIO = 0.23;

/** How much of a synopsis the detail pane shows before it becomes the thing you scroll past. */
const MAX_LENGTH = 600;

function readsAsProse(text: string): boolean {
  if (text.length < MIN_LENGTH) {
    return false;
  }
  const words = text.toLowerCase().match(/[a-z']+/g);
  if (!words?.length) {
    return false;
  }
  const carrying = words.filter((word) => FUNCTION_WORDS.has(word)).length;
  return carrying / words.length >= MIN_FUNCTION_WORD_RATIO;
}

/**
 * Cut at the last sentence that ends inside the budget, so the synopsis stops somewhere a person
 * would have stopped. A syllabus that opens with a long keyword run before getting to the prose
 * can have no sentence end to find, so fall back to a word boundary.
 */
function truncate(text: string): string {
  if (text.length <= MAX_LENGTH) {
    return text;
  }
  const budget = text.slice(0, MAX_LENGTH);
  // Not a bare period: the abbreviations that defeat sentence-splitting above would defeat this
  // too. A sentence has ended when the next thing is a capital letter or the text ran out.
  const sentences = /^[\s\S]*[.!?](?=\s+[A-Z“"(])/.exec(budget);
  if (sentences && sentences[0].length > MAX_LENGTH / 2) {
    return sentences[0].trimEnd();
  }
  return `${budget.slice(0, budget.lastIndexOf(" ")).trimEnd()}…`;
}

/**
 * The court's own summary of the case, or null when it filed a topic list instead of one.
 *
 * Unlike the case name and the snippet, this field comes back unhighlighted — no query terms are
 * marked in it — but it still goes through `toMarkdown`, which is what flattens the <br> tags and
 * the line breaks it does carry.
 */
export function synopsisToMarkdown(syllabus: string | undefined): string | null {
  if (!syllabus?.trim()) {
    return null;
  }
  const body = toMarkdown(syllabus);
  // Weighed without the emphasis, so `**` never counts towards the length of the prose.
  return readsAsProse(body.replace(/\*\*/g, "")) ? truncate(body) : null;
}
