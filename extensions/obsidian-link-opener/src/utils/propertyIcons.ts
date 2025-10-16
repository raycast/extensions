import { Icon } from "@raycast/api";

// Property name normalization map
const PROPERTY_ALIASES: Record<string, string> = {
  docs: "documentation",
  shop: "store",
  wiki: "wikipedia",
  "change log": "changelog",
  "release notes": "release-notes",
};

// Icon mappings organized by category as per docs/supported-properties.md
const PROPERTY_ICON_MAP: Record<string, Icon> = {
  // Web Properties
  homepage: Icon.House,
  documentation: Icon.Document,
  help: Icon.QuestionMark,
  webapp: Icon.Globe,
  wikipedia: Icon.Book,

  // Social Media
  twitter: Icon.SpeechBubble,
  linkedin: Icon.SpeechBubble,
  youtube: Icon.Video,
  medium: Icon.Document,
  reddit: Icon.SpeechBubble,
  discord: Icon.SpeechBubble,
  slack: Icon.SpeechBubble,
  telegram: Icon.SpeechBubble,
  whatsapp: Icon.SpeechBubble,
  signal: Icon.SpeechBubble,
  keybase: Icon.Person,

  // Developer Resources
  awesome: Icon.Star,
  cheatsheet: Icon.List,
  codepen: Icon.Code,
  codesandbox: Icon.Code,
  glitch: Icon.Code,
  playground: Icon.Code,
  stackoverflow: Icon.Code,

  // Design & Collaboration
  figma: Icon.Pencil,
  dribbble: Icon.Pencil,
  behance: Icon.Pencil,
  notion: Icon.Document,
  miro: Icon.Window,
  loom: Icon.Video,
  zoom: Icon.Video,

  // Community
  forum: Icon.SpeechBubble,
  hackernews: Icon.SpeechBubble,

  // E-commerce
  store: Icon.Cart,
  marketplace: Icon.Cart,

  // Project properties
  "release-notes": Icon.Megaphone,
  blog: Icon.Paragraph,
  changelog: Icon.Megaphone,
  dashboard: Icon.Window,
  github: Icon.Code,
  gitlab: Icon.Code,
  guide: Icon.Compass,
  repo: Icon.Code,
  repository: Icon.Code,
  roadmap: Icon.Map,

  // other properties
  producthunt: Icon.Rocket,
};

/**
 * Get the appropriate icon for a URL property
 * @param property The property name from frontmatter
 * @returns The icon to display for this property type
 */
export function getPropertyIcon(property: string): Icon {
  // Normalize the property name
  const normalizedProperty = normalizePropertyName(property);

  // Look up the icon
  return PROPERTY_ICON_MAP[normalizedProperty] || Icon.Link;
}

/**
 * Normalize a property name by applying aliases and lowercasing
 * @param property The original property name
 * @returns The normalized property name
 */
function normalizePropertyName(property: string): string {
  const lowercased = property.toLowerCase();
  return PROPERTY_ALIASES[lowercased] || lowercased;
}
