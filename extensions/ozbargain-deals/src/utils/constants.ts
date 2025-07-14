import * as SanitizeHTML from "sanitize-html";

export const OZB_FEED_URL = "https://www.ozbargain.com.au/feed";
export const MAX_DESCRIPTION_LENGTH = 1500; // Truncate long descriptions in Detail view

export const sanitizeOptions: SanitizeHTML.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "b", "i", "a", "img", "ul", "ol", "li", "blockquote", "code", "pre"],
  allowedAttributes: {
    a: ["href", "title", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
  allowedStyles: {},
  allowedClasses: {},
  transformTags: {
    a: (tagName: string, attribs: { [key: string]: string }) => ({
      tagName,
      attribs: { ...attribs, rel: "noopener noreferrer nofollow" },
    }),
  },
  allowedSchemes: ["http", "https"],
  disallowedTagsMode: "escape",
  enforceHtmlBoundary: true,
  nestingLimit: 10,
};
