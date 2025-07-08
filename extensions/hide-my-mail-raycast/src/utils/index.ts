export const APP_RULE_PREFIX = "[hide_mail]";
export const EMPTY_LABEL = "unused";
export const SEPARATOR = "|";

export function generateRandomEmail(domain: string): string {
  const adjectives = [
    "happy",
    "clever",
    "bright",
    "quick",
    "calm",
    "bold",
    "fresh",
    "kind",
    "wise",
    "cool",
    "smart",
    "nice",
    "fast",
    "warm",
    "safe",
    "blue",
    "red",
    "green",
    "gold",
    "silver",
  ];

  const nouns = [
    "cat",
    "dog",
    "bird",
    "fish",
    "lion",
    "bear",
    "deer",
    "fox",
    "owl",
    "bee",
    "tree",
    "rock",
    "star",
    "moon",
    "sun",
    "wave",
    "wind",
    "fire",
    "rain",
    "snow",
  ];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 99) + 1;

  return `${adjective}-${noun}-${number}@${domain}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractDomainFromEmail(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : "";
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateLabel(label: string): { isValid: boolean; error?: string } {
  if (!label) {
    return { isValid: false, error: "Label is required" };
  }

  if (label.length > 64) {
    return { isValid: false, error: "Label must be 64 characters or less" };
  }

  if (label.includes(SEPARATOR)) {
    return { isValid: false, error: `Label cannot contain the "${SEPARATOR}" character` };
  }

  return { isValid: true };
}

export function validateDescription(description: string): { isValid: boolean; error?: string } {
  if (description.length > 256) {
    return { isValid: false, error: "Description must be 256 characters or less" };
  }

  if (description.includes(SEPARATOR)) {
    return { isValid: false, error: `Description cannot contain the "${SEPARATOR}" character` };
  }

  return { isValid: true };
}
