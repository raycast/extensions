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
    "div",
    "span",
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
  ],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  transformTags: {
    a: (tagName: string, attribs: { [key: string]: string }) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer" },
    }),
  },
  allowedSchemes: ["http", "https", "mailto"],
};
