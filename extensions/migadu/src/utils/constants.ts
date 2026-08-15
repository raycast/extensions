import { adjectives, animals, colors, Config } from "unique-names-generator";

export const MAILBOX_SPAM_ACTIONS = [
  { selected: false, value: "none", title: "No action, keep in Inbox" },
  { selected: false, value: "subject", title: "Prefix subject with SPAM, keep in Inbox" },
  { selected: true, value: "folder", title: "Move to IMAP Junk folder (default)" },
  { selected: false, value: "drop", title: "Drop message" },
];

export const MAILBOX_SPAM_AGGRESSIVENESS = [
  { selected: false, value: "most_permissive", title: "Most permissive" },
  { selected: false, value: "more_permissive", title: "More permissive" },
  { selected: false, value: "permissive", title: "Permissive" },
  { selected: true, value: "default", title: "Domain set (default)" },
  { selected: false, value: "strict", title: "Strict" },
  { selected: false, value: "stricter", title: "Stricter" },
  { selected: false, value: "strictest", title: "Strictest" },
];

export const UNIQUE_NAME_GENERATOR_CONFIG: Config = {
  dictionaries: [adjectives, colors, animals],
  separator: "-",
};
