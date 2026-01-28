import type { Card } from "@src/data/cards";

/**
 * Creates a unique key for a test card.
 * Used for tracking card usage and ranking.
 *
 * @param card - The test card object
 * @returns A unique string identifier for the card
 *
 * @example
 * ```typescript
 * const card = { name: "Visa", number: "4242 4242 4242 4242", ... };
 * createCardKey(card) // "Visa:4242 4242 4242 4242"
 * ```
 */
const createCardKey = (card: Card): string => {
  const key = `${card.name}:${card.number}`;
  return key;
};

/**
 * Creates an expiry date string for test card autofill.
 * Generates a date one year in the future.
 *
 * @returns Expiry date in MM/YY format
 *
 * @example
 * ```typescript
 * createExpiryDate() // "3/25" (if current date is in March 2024)
 * ```
 */
const createExpiryDate = (): string => {
  const now = new Date();

  const month = now.getMonth();
  const year = String(now.getFullYear() + 1).slice(-2);

  const expiryDate = `${month}/${year}`;
  return expiryDate;
};

/**
 * Creates an AppleScript to autofill a checkout form with test card data.
 * The script uses System Events to type card information into the active form.
 *
 * @param card - The test card to use for autofill
 * @returns AppleScript string that can be executed to fill the form
 *
 * @example
 * ```typescript
 * const card = { name: "Visa", number: "4242424242424242", cvc: 123, ... };
 * const script = createAppleScript(card);
 * await runAppleScript(script);
 * ```
 *
 * @remarks
 * - Key code 48 is the Tab key in AppleScript
 * - Uses a default ZIP code of 12345
 * - Assumes standard checkout form field order: card number → expiry → CVC → ZIP
 */
const createAppleScript = (card: Card): string => {
  const date = createExpiryDate();
  const zip = 12345;

  const script = `
    tell application "System Events"
        keystroke "${card.number}"
        key code 48

        keystroke "${date}"
        key code 48

        keystroke "${card.cvc}"
        key code 48

        key code 48

        keystroke "${zip}"
    end tell
`;

  return script;
};

export { createCardKey, createExpiryDate, createAppleScript };
