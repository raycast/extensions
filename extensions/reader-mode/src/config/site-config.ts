/**
 * Site-specific configuration for content extraction.
 * Based on Safari Reader Mode's site configuration approach.
 *
 * Some websites have non-standard HTML structures that require custom handling
 * to properly extract article content.
 *
 * NOTE: Complex sites like Hacker News, GitHub, and Reddit are handled by
 * dedicated extractors in src/extractors/ which provide richer content extraction.
 */

/**
 * Configuration for formatting image captions.
 * Used for sites that have separate caption text and credit elements.
 */
export interface CaptionConfig {
  /**
   * CSS selector for the caption text element.
   * This text will be wrapped in <em> tags for italic formatting.
   */
  textSelector: string;

  /**
   * CSS selector for the photo credit element.
   * A space will be prepended to separate it from the caption text.
   */
  creditSelector: string;
}

export interface SiteConfig {
  /** Display name for the site */
  name: string;

  /**
   * CSS selector(s) to find the main article content.
   * Can be a single selector or multiple comma-separated selectors.
   * Examples:
   * - Single: ".article-body"
   * - Multiple: "article .content, .post-body, .entry-content"
   */
  articleSelector?: string;

  /**
   * Array of CSS selectors for elements to remove before extraction.
   * Each selector is applied independently to find and remove matching elements.
   * Examples:
   * - [".ads", ".sidebar", "#comments"]
   * - [".newsletter-signup", '[data-testid="share-button"]']
   */
  removeSelectors?: string[];

  /**
   * Array of text patterns to match for element removal.
   * Elements (buttons, spans, divs) containing text matching these patterns will be removed.
   * Useful for removing elements that can't be targeted by CSS selectors.
   * Each entry is: { selector: CSS selector to search within, pattern: regex pattern to match text }
   */
  removeTextPatterns?: Array<{ selector: string; pattern: string }>;

  /**
   * Array of selectors for elements to convert from block to inline (div -> span).
   * Useful for fixing sites that use divs for inline content like dates,
   * which causes unwanted line breaks in markdown.
   */
  inlineSelectors?: string[];

  /**
   * If true, prefer Schema.org metadata over other sources.
   * Useful for sites with rich structured data.
   */
  preferSchemaOrg?: boolean;

  /**
   * Configuration for formatting image captions.
   * Wraps caption text in <em> and adds space before credits.
   * Useful for Condé Nast sites and others with structured captions.
   */
  captionConfig?: CaptionConfig;
}

/**
 * Common selectors to remove across all sites.
 * Based on EasyList and common ad/distraction patterns.
 */
export const COMMON_REMOVE_SELECTORS = [
  // Outbrain and Taboola
  "#taboola-below-article-thumbnails",
  ".OUTBRAIN",
  "[data-widget-id^='outbrain']",
  ".taboola-container",

  // Generic ads
  "[id^='div-gpt-ad']",
  ".ad-container",
  ".sidebar-ad",
  ".banner-ad",

  // Social sharing
  ".share-buttons",
  ".social-share",
  "[data-testid='share-button']",

  // Comments (often loaded separately)
  "#disqus_thread",
  ".userComments",
  ".comments-section",

  // Video overlays
  "#primis-holder",
  ".aniview-inline-player",
  ".amp-connatix-player",

  // Newsletter signups
  ".newsletter-signup",
  ".newsletter-inline",
  ".email-signup",
];

/**
 * Hostname patterns mapped to their site configuration.
 * Patterns are tested against the hostname using regex.
 *
 * Configuration guide:
 * - articleSelector: Single CSS selector or comma-separated selectors (e.g., ".content, article")
 * - removeSelectors: Array of CSS selectors (e.g., [".ad", ".sidebar"])
 * - preferSchemaOrg: Set to true if the site has reliable Schema.org JSON-LD data
 */
const SITE_CONFIG_LIST: Array<[RegExp, SiteConfig]> = [
  // Wikipedia
  [
    /^(.*\.)?wikipedia\.org$/i,
    {
      name: "Wikipedia",
      articleSelector: "#mw-content-text",
      removeSelectors: [
        ".mw-editsection",
        ".navbox",
        ".vertical-navbox",
        ".sistersitebox",
        ".mbox-small",
        "#coordinates",
        ".reference",
        ".reflist",
        "#toc",
        ".toc",
        ".infobox",
        ".sidebar",
        ".hatnote",
        ".metadata",
      ],
    },
  ],

  // Medium
  [
    /^(.*\.)?medium\.com$/i,
    {
      name: "Medium",
      articleSelector: "article",
      removeSelectors: [
        '[data-testid="headerSocialShareButton"]',
        '[data-testid="audioPlayButton"]',
        ".pw-multi-vote-count",
        '[aria-label="responses"]',
        '[data-testid="storyFooter"]',
      ],
    },
  ],

  // Substack
  [
    /^(.*\.)?substack\.com$/i,
    {
      name: "Substack",
      articleSelector: ".body",
      removeSelectors: [
        ".subscribe-widget",
        ".subscription-widget",
        ".footer",
        ".comments-section",
        ".share-dialog",
        ".post-footer",
      ],
    },
  ],

  // New York Times
  [
    /^(.*\.)?nytimes\.com$/i,
    {
      name: "NYTimes",
      articleSelector: "article",
      removeSelectors: [
        '[data-testid="share-tools"]',
        ".ad",
        ".newsletter-signup",
        '[data-testid="inline-message"]',
        ".story-footer",
        // Lightbox/modal spans that leak "Open modal at item X of Y" accessibility text
        ".kyt-wljQC",
        // Print edition metadata div
        ".css-lojhqv",
        // Related content/recirculation (use ID selector - more reliable than data-testid)
        "#bottom-sheet-sensor",
        // "See more on" links
        ".css-b9twaf",
        // Correction policy boilerplate
        ".css-1j12tm1",
        ".css-s2htvn",
      ],
      // Convert block elements to inline for better markdown rendering
      inlineSelectors: [
        // Correction date div (e.g., "Dec. 29, 2025") should be inline with "A correction was made on"
        ".css-dzvz0g",
      ],
    },
  ],

  // The Guardian
  [
    /^(.*\.)?theguardian\.com$/i,
    {
      name: "Guardian",
      articleSelector: '[itemprop="articleBody"]',
      removeSelectors: [".submeta", ".content-footer", ".contributions__epic", ".ad-slot", ".js-most-popular-footer"],
    },
  ],

  // BBC
  [
    /^(.*\.)?bbc\.(com|co\.uk)$/i,
    {
      name: "BBC",
      articleSelector: "article",
      removeSelectors: [
        '[data-component="related-topics"]',
        '[data-component="links-block"]',
        ".ssrcss-1q0x1qg-Promo",
        ".ssrcss-1mrs5ns-PromoLink",
        '[data-testid="hero-image"]',
        '[data-component="image-block"]',
        '[data-component="byline-block"]',
      ],
    },
  ],

  // Washington Post
  [
    /^(.*\.)?washingtonpost\.com$/i,
    {
      name: "WashingtonPost",
      articleSelector: "article",
      removeSelectors: [".hide-for-print", ".dn-print", '[data-qa="subscribe-promo"]', ".newsletter-inline"],
    },
  ],

  // San Francisco Chronicle
  [
    /^(.*\.)?sfchronicle\.com$/i,
    {
      name: "SanFranciscoChronicle",
      articleSelector: "article",
      removeSelectors: [
        ".pageHeader",
        ".hide-for-print",
        ".badge-logo",
        ".dn-print",
        ".uiTextLarge",
        ".deep",
        ".cardByline",
        ".smallTimestamp",
        ".primarySm",
        ".g40",
        ".newsletter-inline",
        "#everlit-audio-embed-container",
        '[data-testid="paywall"]',
        '[data-testid="inline-promo"]',
        '[data-block-type="ad"]',
        '[data-qa="subscribe-promo"]',
        '[data-eid="collection-122511-mostPopular"]',
        '[data-eid="collection-113361-dynamic_package"]',
        "#__next > main > div.f.fdc.lg\\:fdr.lg\\:sx56.mx20.sm\\:mx32.xl\\:mxa.xl\\:mw1200px.mb20 > div.mnw0.sm\\:px40.lg\\:px56.x100 > div:nth-child(1) > article > div:nth-child(7)",
        "#__next > main > div.f.fdc.lg\\:fdr.lg\\:sx56.mx20.sm\\:mx32.xl\\:mxa.xl\\:mw1200px.mb20 > div.mnw0.sm\\:px40.lg\\:px56.x100 > div:nth-child(1) > article > div:nth-child(11) > div",
        ".pt16.sy16.bb.bt.b-gray300.mb32",
      ],
    },
  ],

  // Ars Technica
  [
    /^(.*\.)?arstechnica\.com$/i,
    {
      name: "ArsTechnica",
      articleSelector: ".article-content",
      removeSelectors: [".sidebar", ".ad", ".related-stories", ".comment-counts"],
    },
  ],

  // The Verge
  [
    /^(.*\.)?theverge\.com$/i,
    {
      name: "TheVerge",
      articleSelector: ".duet--article--article-body-component",
      removeSelectors: [".duet--ad--ad-wrapper", ".duet--recirculation--related-list"],
    },
  ],

  // Wired
  [
    /^(.*\.)?wired\.com$/i,
    {
      name: "Wired",
      articleSelector: ".body__inner-container",
      removeSelectors: [".ad", ".newsletter-subscribe-form", ".related-content"],
    },
  ],

  // Reuters
  [
    /^(.*\.)?reuters\.com$/i,
    {
      name: "Reuters",
      articleSelector: '[data-testid="Article"]',
      removeSelectors: [
        ".ad",
        ".newsletter-subscribe-form",
        ".related-content",
        ".article-body-module__trust-badge__5mS3f",
        '[data-testid="promo-box"]',
        '[data-testid="Tags"]',
        '[data-testid="ContextWidget"]',
        '[data-testid="AuthorBio"]',
        '[data-testid="NewTabSymbol"]',
        '[data-testid="Link"] > span[style*="clip"]',
      ],
    },
  ],

  // TechCrunch
  [
    /^(.*\.)?techcrunch\.com$/i,
    {
      name: "TechCrunch",
      articleSelector: ".entry-content",
      removeSelectors: [
        ".embed-tc-newsletter",
        ".related-posts",
        ".ad-unit",
        ".wp-block-techcrunch-inline-cta",
        '[data-ctatext="View Bio"]',
        ".wp-block-image__credits", // Remove "Image Credits:" spans from figcaptions
      ],
    },
  ],

  // NOTE: Hacker News, GitHub, Reddit, and YouTube are now handled by dedicated extractors
  // in src/extractors/ - they provide richer content extraction than configs

  // Stack Overflow
  [
    /^(.*\.)?stackoverflow\.com$/i,
    {
      name: "StackOverflow",
      articleSelector: ".question, .answer",
      removeSelectors: [".js-vote-count", ".post-menu", ".comments", ".s-anchors"],
    },
  ],

  // Apple
  [
    /^(.*\.)?apple\.com$/i,
    {
      name: "Apple",
      articleSelector: '*[itemprop="articleBody"]',
      preferSchemaOrg: true,
    },
  ],

  // Engadget
  [
    /^(.*\.)?engadget\.com$/i,
    {
      name: "Engadget",
      articleSelector: "main article #page_body",
      removeSelectors: [".ad", ".newsletter-signup"],
    },
  ],

  // CNET
  [
    /^(.*\.)?cnet\.com$/i,
    {
      name: "CNET",
      articleSelector: "#rbContent.container",
      removeSelectors: [".ad", ".newsletter-signup"],
    },
  ],

  // Le Monde
  [
    /^(.*\.)?lemonde\.fr$/i,
    {
      name: "Le Monde",
      articleSelector: ".article__content",
      removeSelectors: [
        ".reading-mode-only",
        ".capping",
        ".article__header",
        ".ds-header",
        ".ds-article-status",
        ".ds-footer",
      ],
    },
  ],

  // Mashable
  [
    /^(.*\.)?mashable\.com$/i,
    {
      name: "Mashable",
      articleSelector: ".parsec-body .parsec-container",
      removeSelectors: [".ad", ".newsletter-signup"],
    },
  ],

  // BuzzFeed
  [
    /^(.*\.)?buzzfeed\.com$/i,
    {
      name: "BuzzFeed",
      articleSelector: "article #buzz_sub_buzz",
      removeSelectors: [".ad", ".newsletter-signup", ".share-buttons"],
    },
  ],

  // The Intercept
  [
    /^(.*\.)?theintercept\.com$/i,
    {
      name: "TheIntercept",
      articleSelector: ".PostContent",
      removeSelectors: [".ad", ".newsletter-signup", ".share-tools"],
    },
  ],

  // IETF (technical documents)
  [
    /^(.*\.)?ietf\.org$/i,
    {
      name: "IETF",
      articleSelector: "div.content",
      removeSelectors: [".nav", ".sidebar"],
    },
  ],

  // Bloomberg
  [
    /^(.*\.)?bloomberg\.com$/i,
    {
      name: "Bloomberg",
      articleSelector: "article",
      removeSelectors: [".ad", '[data-component="paywall"]', ".newsletter-signup", ".sticky-ad", ".right-rail"],
    },
  ],

  // Reuters
  [
    /^(.*\.)?reuters\.com$/i,
    {
      name: "Reuters",
      articleSelector: '[data-testid="article-body"]',
      removeSelectors: [".ad", '[data-testid="Slideshow"]', ".related-coverage", ".trust-principles"],
    },
  ],

  // Forbes
  [
    /^(.*\.)?forbes\.com$/i,
    {
      name: "Forbes",
      articleSelector: ".article-body",
      removeSelectors: [".ad", ".forbes-subscribe", ".newsletter-tout", "#taboola-below-article-thumbnails", ".fs-ad"],
    },
  ],

  // WSJ
  [
    /^(.*\.)?wsj\.com$/i,
    {
      name: "WSJ",
      articleSelector: ".article-container",
      removeSelectors: [".e1jdulti0"],
    },
  ],

  // Vanity Fair (Condé Nast)
  [
    /^(.*\.)?vanityfair\.com$/i,
    {
      name: "Vanity Fair",
      articleSelector: "article",
      removeSelectors: [".e1jdulti0"],
      captionConfig: {
        textSelector: ".caption__text, [class*='CaptionText-']",
        creditSelector: ".caption__credit, [class*='CaptionCredit-']",
      },
    },
  ],

  // Atlantic
  [
    /^(.*\.)?theatlantic\.com$/i,
    {
      name: "TheAtlantic",
      articleSelector: "article .article-body",
      removeSelectors: [".ad", ".newsletter-inline-unit", ".related-articles", "#paywall-portal-root"],
    },
  ],

  // Vice
  [
    /^(.*\.)?vice\.com$/i,
    {
      name: "Vice",
      articleSelector: ".article__body",
      removeSelectors: [".ad", ".newsletter-signup", ".related-articles", ".topics-strip"],
    },
  ],

  // Vox
  [
    /^(.*\.)?vox\.com$/i,
    {
      name: "Vox",
      articleSelector: ".c-entry-content",
      removeSelectors: [".ad", ".m-newsletter-signup", ".c-article-footer", ".c-read-more"],
    },
  ],

  // Polygon (same network as Vox)
  [
    /^(.*\.)?polygon\.com$/i,
    {
      name: "Polygon",
      articleSelector: ".c-entry-content",
      removeSelectors: [".ad", ".m-newsletter-signup", ".c-article-footer"],
    },
  ],

  // CNN
  [
    /^(.*\.)?cnn\.com$/i,
    {
      name: "CNN",
      articleSelector: ".article__content",
      removeSelectors: [
        ".ad",
        ".el__leafmedia--source-link",
        ".related-content",
        '[data-zone-label="modal"]',
        ".ad-feedback-link-container",
        ".video-resource-elevate",
      ],
    },
  ],

  // Axios
  [
    /^(.*\.)?axios\.com$/i,
    {
      name: "Axios",
      articleSelector: ".article-content",
      removeSelectors: [".ad", ".newsletter-signup", ".story-footer", ".stream-item-container"],
    },
  ],

  // SFGate
  [
    /^(.*\.)?sfgate\.com$/i,
    {
      name: "SFGate",
      articleSelector: "article .rel, .articleBody",
      removeSelectors: [
        ".deep",
        ".pbs",
        ".ttu",
        '[data-block-type="ad"]',
        ".hnpad-Inline",
        '[class*="hnpad-"]',
        ".uiTextSmall.f.aic.jcc",
        ".uiHeader11.f.aic.jcc",
        ".md\\:pt16.md\\:sy16.md\\:bb.md\\:bt.b-gray300.mb32",
        "f.aic.fdc.pt24",
        '[data-eid^="card-"]',
      ],
    },
  ],

  // Quartz
  [
    /^(.*\.)?qz\.com$/i,
    {
      name: "Quartz",
      articleSelector: "article .article-content",
      removeSelectors: [".ad", ".paywall-gate", ".newsletter-signup", ".related-content"],
    },
  ],

  // Ghost (self-hosted and ghost.io)
  [
    /^(.*\.)?ghost\.(io|org)$/i,
    {
      name: "Ghost",
      articleSelector: ".gh-content, .post-content",
      removeSelectors: [".gh-sidebar", ".gh-subscribe", ".gh-navigation", ".gh-footer"],
    },
  ],

  // Squarespace
  [
    /squarespace\.com$/i,
    {
      name: "Squarespace",
      articleSelector: ".blog-item-content, .entry-content",
      removeSelectors: [".sqs-block-newsletter", ".sqs-block-social-accounts", ".sqs-block-archive"],
    },
  ],

  // Drupal (common patterns)
  [
    /drupal\.(org|com)$/i,
    {
      name: "Drupal",
      articleSelector: ".field--name-body, .node__content",
      removeSelectors: [".field--name-field-tags", ".links", ".comment-wrapper"],
    },
  ],

  // WordPress.com (hosted blogs)
  [
    /^(.*\.)?wordpress\.com$/i,
    {
      name: "WordPress.com",
      articleSelector: ".entry-content, .post-content",
      removeSelectors: [".sharedaddy", ".jp-relatedposts", ".wpl-likebox", ".post-likes-widget"],
    },
  ],

  // Blogger/Blogspot
  [
    /^(.*\.)?blogspot\.com$/i,
    {
      name: "Blogger",
      articleSelector: ".post-body, .entry-content",
      removeSelectors: [".blog-pager", ".post-share-buttons", ".reactions", ".post-footer"],
    },
  ],

  // Tumblr
  [
    /^(.*\.)?tumblr\.com$/i,
    {
      name: "Tumblr",
      articleSelector: ".post-content, .body-text",
      removeSelectors: [".post-notes", ".reblog-header", ".post-controls", ".like-button"],
    },
  ],

  // Graham Duncan Blog (Elementor-based WordPress)
  [
    /^grahamduncan\.blog$/i,
    {
      name: "GrahamDuncanBlog",
      articleSelector: ".elementor-widget-theme-post-content",
      removeSelectors: [
        ".elementor-col-33", // Remove sidebar navigation column
        "nav",
        ".menu-main-menu-container",
        "#menu-main-menu",
      ],
    },
  ],
];

/**
 * Gets the site configuration for a given hostname.
 * Returns null if no configuration is defined for the hostname.
 */
export function getSiteConfig(hostname: string): SiteConfig | null {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");

  for (const [pattern, config] of SITE_CONFIG_LIST) {
    if (pattern.test(normalizedHostname)) {
      return config;
    }
  }

  return null;
}

/**
 * Gets the article selector for a hostname, if one is defined.
 */
export function getArticleSelectorForHostname(hostname: string): string | null {
  const config = getSiteConfig(hostname);
  return config?.articleSelector ?? null;
}
