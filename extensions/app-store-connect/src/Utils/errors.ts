/**
 * Turns an App Store Connect failure into something a person can act on.
 *
 * Two problems this solves. First, Apple frequently returns the same string as both
 * `title` and `detail`, which surfaced as a toast that said the same sentence twice.
 * Second, Apple's wording describes the API's state rather than what the user should
 * do — "The build is not in a valid processing state for this operation" does not say
 * to wait for processing to finish.
 *
 * Kept free of Raycast imports so the mapping can be exercised outside Raycast.
 */

interface ErrorPresentation {
  title: string;
  message: string;
}

/**
 * Known App Store Connect failures, matched on a distinctive fragment of Apple's text.
 * `title` is what went wrong; `message` is what to do about it.
 */
/**
 * ORDER IS SIGNIFICANT — the first match wins.
 *
 * Permission cases are listed BEFORE existence cases on purpose. Apple returns combined
 * wording such as "the resource does not exist or you are not authorized to access it",
 * which an existence-first list would answer with "reload the list" when the real fix is
 * to obtain access.
 *
 * Every entry must be safe for EVERY error its pattern can match. Where Apple's wording
 * is generic enough to cover several distinct causes, prescribe nothing and let the
 * original detail through instead of guessing — wrong advice is worse than none.
 */
const KNOWN_ERRORS: { match: RegExp; title: string; message: string }[] = [
  {
    match: /rate limit|too many requests/i,
    title: "Rate Limited",
    message: "App Store Connect is throttling requests. Wait a moment and try again.",
  },
  {
    match: /forbidden|not authorized|unauthorized|insufficient|permission/i,
    title: "Not Permitted",
    message: "This API key's role doesn't allow that. An Admin or App Manager key is usually required.",
  },
  {
    match: /export compliance/i,
    title: "Export Compliance Missing",
    message: "This build needs its encryption declaration before it can be distributed.",
  },
  {
    // Deliberately case-SENSITIVE, and deliberately not `/processing state/i`: Apple's
    // generic "not in a valid processing state" also covers invalid, failed, and expired
    // builds, where "wait for it to finish" is wrong advice. Only natural-language
    // "still processing", or the literal PROCESSING enum, means waiting will help.
    match: /[Ss]till (being )?process|\bPROCESSING\b/,
    title: "Build Isn't Ready Yet",
    message: "App Store Connect is still processing this build. Wait for it to finish, then try again.",
  },
  {
    // The generic form, matched only AFTER the specific "still processing" case above.
    // It covers processing, invalid, failed, and expired builds alike, so the message
    // names the possibilities instead of prescribing one — but still beats Apple's
    // wording, which never says the state is the problem.
    match: /not in a valid .*state/i,
    title: "Build Can't Be Used Here",
    message: "It may still be processing, or it may have expired or failed validation. Check the build's status.",
  },
  {
    // A resource-level conflict only. An ATTRIBUTE duplicate (a reused build number, a
    // taken group name) needs the value changed, not "nothing to do" — so that wording
    // is deliberately not claimed here.
    match: /already exists/i,
    title: "Already Exists",
    message: "A resource with those details is already present.",
  },
  {
    match: /not found|does not exist/i,
    title: "Not Found",
    message: "It may have been deleted in App Store Connect. Go back and reload to get the current list.",
  },
];

/**
 * Builds the toast content for an App Store Connect error.
 *
 * @param title Apple's error title.
 * @param detail Apple's error detail, which is often identical to the title.
 */
export function presentableApiError(title: string, detail: string): ErrorPresentation {
  const combined = `${title} ${detail}`;
  const known = KNOWN_ERRORS.find((candidate) => candidate.match.test(combined));
  if (known) {
    return { title: known.title, message: known.message };
  }

  // Apple often repeats itself across the two fields; show the sentence once.
  const trimmedTitle = title.trim();
  const trimmedDetail = detail.trim();
  if (trimmedDetail.length === 0 || trimmedDetail === trimmedTitle) {
    return { title: trimmedTitle, message: "" };
  }
  // A detail that merely restates the title with punctuation is still a repeat.
  const normalize = (value: string) => value.replace(/[.\s]+$/, "").toLowerCase();
  if (normalize(trimmedDetail) === normalize(trimmedTitle)) {
    return { title: trimmedTitle, message: "" };
  }
  return { title: trimmedTitle, message: trimmedDetail };
}
