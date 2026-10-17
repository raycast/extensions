/**
 * Deliberately strict enough to stop obvious junk from burning a Bouncer credit,
 * loose enough to let Bouncer be the real authority on syntax.
 */
const EMAIL_PATTERN = /^[^\s@,;:<>"()[\]\\]+@[^\s@,;:<>"()[\]\\.]+(\.[^\s@,;:<>"()[\]\\.]+)+$/;

/**
 * Only trims and unwraps. Internal whitespace is left alone on purpose — stripping it
 * would weld a pasted signature block into a single address-shaped string that passes
 * validation and burns a credit. Use `extractEmail` for anything with whitespace in it.
 */
export function normalizeEmail(input: string): string {
  return input
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/^<|>$/g, "")
    .trim();
}

export function isValidEmail(input: string): boolean {
  const email = normalizeEmail(input);
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

/** Pulls the first email-looking token out of arbitrary text, e.g. a copied signature block. */
export function extractEmail(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  const match = text.match(/[^\s@,;:<>"()[\]\\]+@[^\s@,;:<>"()[\]\\.]+(?:\.[^\s@,;:<>"()[\]\\.]+)+/);
  if (!match) return undefined;
  const candidate = normalizeEmail(match[0].replace(/[.,;:]+$/, ""));
  return isValidEmail(candidate) ? candidate : undefined;
}
