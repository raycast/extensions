import type { Image } from "@raycast/api";
import { Icon } from "@raycast/api";

/**
 * Domain-to-icon mapping using Iconify API for branded icons.
 * Uses SimpleIcons (brand logos) via Iconify's CDN.
 *
 * Iconify API: https://iconify.design/
 * SimpleIcons: https://simpleicons.org/
 *
 * Users can still override with explicit icon in config.
 */

// Iconify API base URL for SimpleIcons
const ICONIFY_BASE = "https://api.iconify.design/simple-icons";

// Domain to SimpleIcons icon name mapping
const DOMAIN_ICON_MAP: Record<string, string> = {
  // Code & Development
  "github.com": "iconify:simple-icons:github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
  "stackoverflow.com": "stackoverflow",
  "dev.to": "devdotto",
  "codepen.io": "codepen",
  "replit.com": "replit",
  "codesandbox.io": "codesandbox",
  "npm.js.com": "npm",
  "npmjs.com": "npm",
  "pypi.org": "pypi",

  // Cloud & Infrastructure
  "aws.amazon.com": "amazonaws",
  "cloud.google.com": "googlecloud",
  "azure.microsoft.com": "microsoftazure",
  "vercel.com": "vercel",
  "netlify.com": "netlify",
  "heroku.com": "heroku",
  "digitalocean.com": "digitalocean",
  "cloudflare.com": "cloudflare",
  "railway.app": "railway",
  "render.com": "render",

  // Communication
  "slack.com": "slack",
  "discord.com": "discord",
  "teams.microsoft.com": "microsoftteams",
  "zoom.us": "zoom",
  "meet.google.com": "googlemeet",
  "telegram.org": "telegram",
  "whatsapp.com": "whatsapp",

  // Productivity & Project Management
  "notion.so": "notion",
  "confluence.atlassian.net": "confluence",
  "atlassian.net": "atlassian",
  "trello.com": "trello",
  "asana.com": "asana",
  "linear.app": "linear",
  "monday.com": "mondaydotcom",
  "jira.atlassian.net": "jira",
  "clickup.com": "clickup",
  "airtable.com": "airtable",
  "coda.io": "coda",

  // Email
  "mail.google.com": "gmail",
  "gmail.com": "gmail",
  "slides.google.com": "iconify:simple-icons:googleslides",
  "docs.google.com": "iconify:simple-icons:googledocs",
  "sheets.google.com": "iconify:simple-icons:googlesheets",
  "outlook.com": "microsoftoutlook",
  "protonmail.com": "protonmail",
  "fastmail.com": "fastmail",

  // Social Media
  "twitter.com": "x",
  "x.com": "x",
  "linkedin.com": "linkedin",
  "reddit.com": "reddit",
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "tiktok.com": "tiktok",
  "pinterest.com": "pinterest",
  "threads.net": "threads",
  "mastodon.social": "mastodon",
  "bsky.app": "bluesky",

  // Media & Entertainment
  "youtube.com": "youtube",
  "vimeo.com": "vimeo",
  "spotify.com": "spotify",
  "soundcloud.com": "soundcloud",
  "netflix.com": "netflix",
  "twitch.tv": "twitch",
  "apple.com/music": "applemusic",
  "podcasts.apple.com": "applepodcasts",

  // Design
  "figma.com": "figma",
  "dribbble.com": "dribbble",
  "behance.net": "behance",
  "canva.com": "canva",
  "sketch.com": "sketch",
  "adobe.com": "adobe",
  "framer.com": "framer",
  "invisionapp.com": "invision",

  // Analytics & Monitoring
  "analytics.google.com": "googleanalytics",
  "mixpanel.com": "mixpanel",
  "amplitude.com": "amplitude",
  "sentry.io": "sentry",
  "datadog.com": "datadog",
  "newrelic.com": "newrelic",
  "grafana.com": "grafana",
  "hotjar.com": "hotjar",

  // Documentation & Knowledge
  "readthedocs.io": "readthedocs",
  "gitbook.com": "gitbook",
  "readme.io": "readme",
  "docusaurus.io": "docusaurus",

  // E-commerce & Finance
  "shopify.com": "shopify",
  "stripe.com": "stripe",
  "paypal.com": "paypal",
  "amazon.com": "amazon",
  "ebay.com": "ebay",
  "etsy.com": "etsy",
  "square.com": "square",

  // Storage & Files
  "drive.google.com": "googledrive",
  "dropbox.com": "dropbox",
  "box.com": "box",
  "onedrive.live.com": "onedrive",
  "icloud.com": "icloud",

  // News & Reading
  "medium.com": "medium",
  "substack.com": "substack",
  "news.ycombinator.com": "ycombinator",
  "hackernews.com": "ycombinator",
  "rss.com": "rss",

  // AI & ML
  "chat.openai.com": "openai",
  "openai.com": "openai",
  "anthropic.com": "anthropic",
  "huggingface.co": "huggingface",
  "kaggle.com": "kaggle",
  "colab.research.google.com": "googlecolab",

  // CI/CD & DevOps
  "circleci.com": "circleci",
  "travis-ci.org": "travisci",
  "jenkins.io": "jenkins",
  "docker.com": "docker",
  "hub.docker.com": "docker",
  "kubernetes.io": "kubernetes",
  "terraform.io": "terraform",
  "ansible.com": "ansible",

  // Databases
  "mongodb.com": "mongodb",
  "postgresql.org": "postgresql",
  "mysql.com": "mysql",
  "redis.io": "redis",
  "supabase.com": "supabase",
  "firebase.google.com": "firebase",
  "planetscale.com": "planetscale",

  // Frameworks & Libraries (docs sites)
  "reactjs.org": "react",
  "react.dev": "react",
  "vuejs.org": "vuedotjs",
  "angular.io": "angular",
  "svelte.dev": "svelte",
  "nextjs.org": "nextdotjs",
  "nuxt.com": "nuxtdotjs",
  "tailwindcss.com": "tailwindcss",

  // Other Popular Services
  "calendly.com": "calendly",
  "cal.com": "caldotcom",
  "1password.com": "1password",
  "lastpass.com": "lastpass",
  "bitwarden.com": "bitwarden",
  "zendesk.com": "zendesk",
  "intercom.com": "intercom",
  "mailchimp.com": "mailchimp",
  "sendgrid.com": "sendgrid",
  "twilio.com": "twilio",
  "auth0.com": "auth0",
  "okta.com": "okta",
};

/**
 * Gets the Iconify URL for an icon.
 * Supports both formats:
 *   - Simple name: "github" → https://api.iconify.design/simple-icons/github.svg
 *   - Full spec: "iconify:simple-icons:github" → https://api.iconify.design/simple-icons/github.svg
 */
function getIconifyUrl(iconSpec: string): string {
  // Check if it's a full iconify spec (iconify:icon-set:icon-name)
  if (iconSpec.startsWith("iconify:")) {
    const parts = iconSpec.split(":");
    if (parts.length === 3) {
      const [, iconSet, iconName] = parts;
      return `https://api.iconify.design/${iconSet}/${iconName}.svg`;
    }
  }
  // Default: assume it's just an icon name for simple-icons
  return `${ICONIFY_BASE}/${iconSpec}.svg`;
}

/**
 * Extracts the domain from a URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove 'www.' prefix and get hostname
    return urlObj.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // If URL parsing fails, try simple extraction
    const match = url.match(/https?:\/\/(?:www\.)?([^/]+)/);
    return match ? match[1].toLowerCase() : "";
  }
}

/**
 * Gets an icon for a URL based on domain mapping.
 * Returns Iconify URL for branded icons, or null for fallback.
 */
export function getIconForUrl(url: string): Image.ImageLike | null {
  const domain = extractDomain(url);

  // Check exact domain match
  if (DOMAIN_ICON_MAP[domain]) {
    return { source: getIconifyUrl(DOMAIN_ICON_MAP[domain]) };
  }

  // Check subdomain matches (e.g., app.github.com → github.com)
  const parts = domain.split(".");
  if (parts.length > 2) {
    const baseDomain = parts.slice(-2).join(".");
    if (DOMAIN_ICON_MAP[baseDomain]) {
      return { source: getIconifyUrl(DOMAIN_ICON_MAP[baseDomain]) };
    }
  }

  // Check for partial matches in domain (e.g., jira.atlassian.net contains atlassian)
  for (const [mappedDomain, iconName] of Object.entries(DOMAIN_ICON_MAP)) {
    if (
      domain.includes(mappedDomain.split(".")[0]) &&
      mappedDomain.includes(".")
    ) {
      return { source: getIconifyUrl(iconName) };
    }
  }

  // Check for localhost patterns - use Terminal icon
  if (domain.startsWith("localhost") || domain.startsWith("127.0.0.1")) {
    return Icon.Terminal;
  }

  return null;
}

/**
 * Gets a specific Iconify icon by name.
 * Can be used for custom icons in config.
 *
 * Usage in config:
 *   icon: "iconify:simple-icons:github"
 *   icon: "iconify:devicon:react-original"
 *   icon: "iconify:mdi:home"
 */
export function getIconifyIcon(iconSpec: string): Image.ImageLike | null {
  // Format: "iconify:icon-set:icon-name"
  const parts = iconSpec.split(":");
  if (parts.length !== 3 || parts[0] !== "iconify") {
    return null;
  }

  const [, iconSet, iconName] = parts;
  return { source: `https://api.iconify.design/${iconSet}/${iconName}.svg` };
}
