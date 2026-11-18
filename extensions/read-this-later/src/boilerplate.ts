// Publisher furniture that Readability leaves behind.
//
// Readability keeps ad slots and section markers because they're structurally
// part of the article, and DOMPurify won't touch them because they're
// legitimate markup containing legitimate text. So "Advertisement" and
// "SKIP ADVERTISEMENT" end up as the first thing you read in a captured NYT
// story.
//
// Deliberately kept dependency-free: the reader imports this, and the reader is
// pulled into the list command's bundle. Anything heavy here (linkedom,
// Readability) would be bundled into a command that never parses HTML.

// Matched against a whole line / a whole element's text, never a substring — a
// sentence that merely mentions advertising must survive untouched.
const BOILERPLATE = new Set([
  "advertisement",
  "advertisements",
  "skip advertisement",
  "continue reading the main story",
  "supported by",
  "sponsored",
  "sponsored content",
]);

// The embedded audio player NYT puts above some articles. Readability keeps its
// label, its duration and its loading message as ordinary text, so a captured
// story reads "Listen · 10:07 min" before the first paragraph.
//
// Every pattern is anchored to the whole line and length-bounded, because these
// are far more collidable with real prose than "SKIP ADVERTISEMENT" is — an
// article could legitimately contain the word "Listen".
const BOILERPLATE_PATTERNS: RegExp[] = [
  // The player's label, alone on its line. A one-word line of prose is
  // vanishingly rare; a heading would still be "## Listen" and is unwrapped
  // by the caller before it gets here.
  /^listen$/,
  // Its duration: "· 10:07 min", "10:07 min", "1:02:33 min".
  /^[·•]?\s*\d{1,2}(:\d{2}){1,2}\s*min(ute)?s?$/,
  // Its placeholder while loading. NOTE: this line was clipped in the
  // screenshot that prompted this, so the exact wording is inferred — the
  // bound keeps a real sentence about audio from being eaten.
  /^.{0,40}\baudio\b.{0,40}\bwill load\b\.?$/,
];

export function isBoilerplate(text: string): boolean {
  const normalised = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (BOILERPLATE.has(normalised)) return true;
  return BOILERPLATE_PATTERNS.some((re) => re.test(normalised));
}

// Strips boilerplate lines from converted Markdown. Applied at read time so it
// also cleans bodies captured by the browser extension or iOS, which this
// extension can't re-capture — they already contain the ad text.
export function stripBoilerplateMarkdown(markdown: string): string {
  const kept = markdown
    .split("\n")
    // Headings are stripped too: turndown renders NYT's ad slots as "## Advertisement".
    .filter((line) => !isBoilerplate(line.replace(/^#{1,6}\s*/, "")));

  // Removing lines leaves runs of blank lines where the ad slots were.
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
