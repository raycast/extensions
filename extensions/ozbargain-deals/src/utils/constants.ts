export const OZB_FEED_URL = "https://www.ozbargain.com.au/feed";
export const MAX_DESCRIPTION_LENGTH = 1500; // Truncate long descriptions in Detail view

// Configure sanitize-html options for safe HTML processing
export const sanitizeOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "b",
    "i",
    "a",
    "img",
    // Removed div and span as they are often used for layout and can be abused.
    // Headings are kept as they are structural for content.
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  transformTags: {
    a: (tagName: string, attribs: { [key: string]: string }) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer nofollow" }, // Added nofollow
    }),
  },
  allowedSchemes: ["http", "https"], // Removed mailto, as it's less common in deal descriptions and can be a vector.
  disallowedAttributes: ["onerror", "onload", "style", "script", "data-*"], // Added script and data-* to disallowed attributes
  // Force stripping of all attributes not explicitly allowed. This is a very strong security measure.
  // This option is not directly available in sanitize-html, but implied by not listing attributes.
  // To achieve a similar effect, we ensure allowedAttributes are strictly defined.
};
