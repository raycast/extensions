import type { Card } from "../data/cards";

const createCardKey = (card: Card) => {
  const key = `${card.name}:${card.number}`;
  return key;
};

const createExpiryDate = () => {
  const now = new Date();

  const month = now.getMonth();
  const year = String(now.getFullYear() + 1).slice(-2);

  const expiryDate = `${month}/${year}`;
  return expiryDate;
};

const createAppleScript = (card: Card) => {
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
