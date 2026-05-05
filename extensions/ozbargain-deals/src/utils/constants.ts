import * as SanitizeHTML from "sanitize-html";

export const OZB_FEED_URL = "https://www.ozbargain.com.au/feed";
export const MAX_DESCRIPTION_LENGTH = 1500; // Truncate long descriptions in Detail view

export const sanitizeOptions: SanitizeHTML.IOptions = {
  // Only allow essential formatting tags for deal descriptions
  allowedTags: ["p", "br", "strong", "em", "u", "b", "i", "a", "ul", "ol", "li"],
  allowedAttributes: {
    // Restrict link attributes and remove potentially dangerous ones
    a: ["href", "title"],
  },
  allowedStyles: {},
  allowedClasses: {},
  transformTags: {
    a: (tagName: string, attribs: { [key: string]: string }) => {
      const href = attribs.href;
      // Only allow links to ozbargain.com.au and major retailers/known safe domains
      if (
        href &&
        (href.startsWith("https://www.ozbargain.com.au/") ||
          href.startsWith("https://ozbargain.com.au/") ||
          href.startsWith("http://www.ozbargain.com.au/") ||
          href.startsWith("http://ozbargain.com.au/"))
      ) {
        const newAttribs: { [key: string]: string } = {
          href: attribs.href,
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        };
        if (attribs.title) {
          newAttribs.title = attribs.title;
        }
        return {
          tagName,
          attribs: newAttribs,
        };
      }
      // Convert disallowed links to plain text spans
      return { tagName: "span", attribs: {} };
    },
  },
  allowedSchemes: ["https"], // Only allow HTTPS for security
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
  nestingLimit: 5, // Reduce nesting limit for simpler content structure
  allowedSchemesAppliedToAttributes: ["href"],
};
