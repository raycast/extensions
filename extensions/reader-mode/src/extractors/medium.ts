import { BaseExtractor, ExtractorResult, ExtractorElement } from "./_base";

/**
 * Extractor for Medium (medium.com)
 *
 * Handles:
 * - Removes duplicate Open Graph images
 * - Removes reading time and metadata elements
 * - Removes interactive elements (clap buttons, share buttons, etc.)
 * - Cleans up AI-generated summary brackets
 * - Removes "Press enter or click to view" text
 */
export class MediumExtractor extends BaseExtractor {
  get siteName(): string {
    return "Medium";
  }

  canExtract(): boolean {
    // Check for Medium-specific elements
    return (
      !!this.querySelector('[data-testid="storyTitle"]') ||
      !!this.querySelector(".pw-post-title") ||
      !!this.querySelector("article.meteredContent") ||
      this.url.includes("medium.com")
    );
  }

  extract(): ExtractorResult {
    // Get the main article container
    const articleContainer =
      this.querySelector("article.meteredContent") ||
      this.querySelector("article") ||
      this.querySelector('[role="main"]') ||
      this.document;

    const clone = articleContainer.cloneNode(true) as ExtractorElement;

    // Remove unwanted elements
    this.removeUnwantedElements(clone);

    // Get the article content
    let content = this.getInnerHTML(clone);

    // Clean up the content
    content = this.cleanContent(content);

    const textContent = this.stripHtml(content);

    return {
      content,
      textContent,
      metadata: {
        title: this.getTitle(),
        author: this.getAuthor(),
        siteName: this.siteName,
        description: textContent.slice(0, 200).replace(/\s+/g, " ").trim(),
      },
    };
  }

  private removeUnwantedElements(container: ExtractorElement): void {
    const removeSelectors = [
      // Reading time and metadata
      '[data-testid="storyReadTime"]',
      ".ja.jb", // Date separator dots
      ".ac.r.iz", // Metadata container with reading time

      // Interactive elements
      '[data-testid="headerClapButton"]',
      '[data-testid="headerBookmarkButton"]',
      '[data-testid="audioPlayButton"]',
      '[data-testid="headerSocialShareButton"]',
      '[data-testid="headerStoryOptionsButton"]',
      ".pw-multi-vote-icon",
      ".pw-multi-vote-count",

      // Author photo (keep author name but remove photo)
      '[data-testid="authorPhoto"]',
      ".m.eo img", // Author avatar images

      // Navigation and UI elements
      'button[aria-label*="clap"]',
      'button[aria-label*="bookmark"]',
      'button[aria-label*="Share"]',
      'button[aria-label*="Listen"]',
      'button[aria-label*="More"]',
      ".ko.aq", // Action buttons

      // Member-only badges
      '[aria-label="Member-only story"]',
      ".gk.r.gl", // Member badge container

      // "Press enter or click" text
      ".er.es.et", // Screen reader text for images
      'span[class*="speechify-ignore"]',

      // Duplicate OG image (first large image is usually duplicate)
      "figure.ml.mm.mn.mo.mp.mq:first-of-type",

      // Social/action panels
      ".ac.cw.jc", // Action panel container
      ".fp.l.k.j.e", // Spacer elements
    ];

    for (const selector of removeSelectors) {
      const elements = container.querySelectorAll(selector);
      elements.forEach((el) => {
        try {
          el.remove();
        } catch {
          // Element might already be removed
        }
      });
    }

    // Remove all SVG icons
    const svgs = container.querySelectorAll("svg");
    svgs.forEach((svg) => svg.remove());

    // Remove all buttons
    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => button.remove());

    // Clean up images with data-testid="og" (Open Graph duplicates)
    const ogImages = container.querySelectorAll('[data-testid="og"]');
    ogImages.forEach((img) => {
      const picture = img.closest("picture");
      if (picture) {
        picture.remove();
      } else {
        img.remove();
      }
    });
  }

  private cleanContent(content: string): string {
    // Remove AI summary brackets like [text in brackets]
    // But only at the start of blockquotes (summary sections)
    content = content.replace(/>\s*\[([^\]]+)\]\s*</g, "> $1<");

    // Remove "Press enter or click to view image in full size" text
    content = content.replace(/Press enter or click to view image in full size/gi, "");

    // Remove empty paragraphs and divs
    content = content.replace(/<(p|div)[^>]*>\s*<\/(p|div)>/g, "");

    // Clean up multiple consecutive line breaks
    content = content.replace(/(\n\s*){3,}/g, "\n\n");

    // Remove aria-hidden elements
    content = content.replace(/<[^>]+aria-hidden="true"[^>]*>.*?<\/[^>]+>/gs, "");

    return content.trim();
  }

  private getTitle(): string {
    // Try Medium-specific title selectors
    const titleElement =
      this.querySelector('[data-testid="storyTitle"]') ||
      this.querySelector(".pw-post-title") ||
      this.querySelector("h1");

    if (titleElement) {
      return this.getTextContent(titleElement);
    }

    return this.document.title || "";
  }

  private getAuthor(): string {
    // Try Medium-specific author selectors
    const authorElement =
      this.querySelector('[data-testid="authorName"]') ||
      this.querySelector('a[rel*="author"]') ||
      this.querySelector(".author-name");

    if (authorElement) {
      return this.getTextContent(authorElement);
    }

    return "";
  }
}
