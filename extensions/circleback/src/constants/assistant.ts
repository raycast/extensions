// Copied from packages/constants, packages/theme, and packages/utils; Raycast
// Store builds can't import workspace packages.

export const THINKING_WORDS = [
  "Thinking",
  "Mulling it over",
  "Theorizing",
  "Analyzing",
  "Searching",
  "Reviewing",
  "Considering",
  "Examining",
  "Reflecting",
  "Exploring",
  "Investigating",
  "Pondering",
  "Planning",
  "Strategizing",
  "Connecting the dots",
  "Excavating",
  "Digging",
  "Uncovering",
];

export const MEETING_HISTORY_NOTICES = {
  canUpgrade:
    "Free includes 30 days of meeting history. Upgrade in Circleback to unlock the full response and restore your meeting history.",
  cannotUpgrade:
    "Free includes 30 days of meeting history. Ask your billing owner to upgrade to unlock the full response and restore your meeting history.",
};

export const MEETING_ACCESS_NOTICE =
  "Transcript access needed. Continue in Circleback to request access from a meeting owner.";

export const EMAIL_DRAFT_NOTICE = "Continue in Circleback to edit and send this email.";

export const INLINE_SOURCE_REGEX = /\s*\[\^([^\]]+)\]/g;
export const PARTIAL_INLINE_SOURCE_REGEX = /\s*\[\^[^\]]*$/;
export const SAVED_SOURCE_REGEX = /\s*<source>[\s\S]*?<\/source>/g;

export const ASSISTANT_COLORS = {
  light: {
    label: "#272727",
    labelSubtle: "#595959",
    labelSecondary: "#7F7F7F",
    labelTertiary: "#B8B8B8",
    backgroundTertiary: "#F5F5F5",
  },
  dark: {
    label: "#CACACA",
    labelSubtle: "#9D9D9D",
    labelSecondary: "#909090",
    labelTertiary: "#6A6A6A",
    backgroundTertiary: "#2A2A2A",
  },
};
