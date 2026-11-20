/**
 * The sites Find Profile checks by default, besides the user's own apps. Each name is a catalog site, unless it
 * appears in BUILT_IN_ALIASES, which point it at the built-in app instead.
 */
export const DEFAULT_SEARCH_SITES = [
  "Blacksky",
  "Bluesky",
  "DEV Community",
  "Discord",
  "Docker Hub",
  "Flickr",
  "GitHub",
  "GitLab",
  "Gumroad",
  "Instagram",
  "Keybase",
  "Letterboxd",
  "LinkedIn",
  "Linktree",
  "Medium",
  "pixelfed.social",
  "ProductHunt",
  "Replit.com",
  "Snapchat",
  "SoundCloud",
  "Substack",
  "TikTok",
  "Telegram",
  "Vimeo",
  "WordPress",
  "mastodon.social",
  "Pinterest",
  "tumblr",
];

/** Default sites that are also built-in apps */
export const BUILT_IN_ALIASES: Record<string, string> = {
  Bluesky: "bluesky",
  GitHub: "github",
  Instagram: "instagram",
  LinkedIn: "linkedin",
  TikTok: "tiktok",
};

/**
 * Sites with no profile URL and no way to check a username, only a username format. Find Profile says whether the
 * username fits and offers to copy it.
 */
export const FORMAT_ONLY_SITES = [
  {
    key: "format-signal",
    name: "Signal",
    homepage: "https://signal.org",
    // libsignal's rules: a nickname of 3 to 32 letters, digits or underscores that doesn't start with a digit, then a
    // dot and 2 to 9 digits. No public directory, and username links are encrypted, so nothing can be opened.
    usernamePattern: "^[A-Za-z_][A-Za-z0-9_]{2,31}\\.(0[1-9]|[1-9][0-9]|[1-9][0-9]{2,8})$",
  },
];
