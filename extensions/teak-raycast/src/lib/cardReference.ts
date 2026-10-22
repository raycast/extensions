// A Teak card id as Convex writes it: 31 to 37 lowercase letters and digits.
const CARD_ID = /^[0-9a-z]{31,37}$/;

/**
 * The card id in what someone pasted: a bare id, or a Teak link such as
 * `https://app.teakvault.com/?card=<id>`. Null when it is neither.
 */
export const parseCardReference = (input: string): string | null => {
  const value = input.trim();
  if (CARD_ID.test(value)) {
    return value;
  }
  try {
    const fromLink = new URL(value).searchParams.get("card")?.trim() ?? "";
    return CARD_ID.test(fromLink) ? fromLink : null;
  } catch {
    return null;
  }
};
