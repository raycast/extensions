import { BaseExtractor, ExtractorResult, ExtractorDocument } from "./_base";

/**
 * Extractor for Reddit (reddit.com, old.reddit.com)
 *
 * Handles:
 * - Self posts with text content
 * - Link posts
 * - Comments
 */
export class RedditExtractor extends BaseExtractor {
  private isOldReddit: boolean;

  constructor(document: ExtractorDocument, url: string, schemaOrgData?: Record<string, unknown> | null) {
    super(document, url, schemaOrgData);
    this.isOldReddit = this.url.includes("old.reddit.com");
  }

  get siteName(): string {
    const subreddit = this.getSubreddit();
    return subreddit ? `Reddit - r/${subreddit}` : "Reddit";
  }

  canExtract(): boolean {
    // Check for post content on new or old Reddit
    return (
      !!this.querySelector('[data-test-id="post-content"]') ||
      !!this.querySelector(".expando") ||
      !!this.querySelector('[slot="text-body"]') ||
      !!this.querySelector(".usertext-body")
    );
  }

  extract(): ExtractorResult {
    const postContent = this.getPostContent();
    const comments = this.extractComments();

    let content = postContent;
    if (comments) {
      content += `\n\n<hr>\n<h2>Comments</h2>\n${comments}`;
    }

    const textContent = this.stripHtml(content);

    return {
      content,
      textContent,
      metadata: {
        title: this.getPostTitle(),
        author: this.getPostAuthor(),
        siteName: this.siteName,
        description: textContent.slice(0, 200).replace(/\s+/g, " ").trim(),
        published: this.getPostDate(),
      },
    };
  }

  private getPostContent(): string {
    // New Reddit (shreddit)
    const shredditBody = this.querySelector('[slot="text-body"]');
    if (shredditBody) {
      return this.getInnerHTML(shredditBody);
    }

    // New Reddit (React)
    const newRedditContent = this.querySelector('[data-test-id="post-content"]');
    if (newRedditContent) {
      const textBody = newRedditContent.querySelector('[data-click-id="text"]');
      if (textBody) {
        return this.getInnerHTML(textBody);
      }

      // Link post - get the link
      const linkElement = newRedditContent.querySelector('a[data-click-id="body"]');
      if (linkElement) {
        const href = this.getAttribute(linkElement, "href") || "";
        return `<p><a href="${href}" target="_blank">${href}</a></p>`;
      }
    }

    // Old Reddit
    const oldRedditContent = this.querySelector(".expando .usertext-body");
    if (oldRedditContent) {
      return this.getInnerHTML(oldRedditContent);
    }

    // Fallback to any usertext-body
    const usertext = this.querySelector(".usertext-body");
    if (usertext) {
      return this.getInnerHTML(usertext);
    }

    return "";
  }

  private extractComments(): string {
    let html = "";

    // New Reddit (shreddit)
    const shredditComments = this.querySelectorAll("shreddit-comment");
    if (shredditComments.length > 0) {
      for (const comment of shredditComments.slice(0, 20)) {
        // Limit to first 20 comments
        const author = this.getAttribute(comment, "author") || "[deleted]";
        const depth = parseInt(this.getAttribute(comment, "depth") || "0", 10);
        const body = comment.querySelector('[slot="comment-body"]');

        if (body) {
          const indent = depth > 0 ? "<blockquote>".repeat(depth) : "";
          const closeIndent = depth > 0 ? "</blockquote>".repeat(depth) : "";

          html += `${indent}<div class="comment">`;
          html += `<div class="comment-header"><strong>${author}</strong></div>`;
          html += `<div class="comment-body">${this.getInnerHTML(body)}</div>`;
          html += `</div>${closeIndent}\n`;
        }
      }
      return html;
    }

    // New Reddit (React)
    const reactComments = this.querySelectorAll('[data-testid="comment"]');
    if (reactComments.length > 0) {
      for (const comment of reactComments.slice(0, 20)) {
        const authorElement = comment.querySelector('[data-testid="comment_author_link"]');
        const author = this.getTextContent(authorElement) || "[deleted]";
        const body = comment.querySelector('[data-testid="comment"] > div:last-child');

        if (body) {
          html += `<div class="comment">`;
          html += `<div class="comment-header"><strong>${author}</strong></div>`;
          html += `<div class="comment-body">${this.getInnerHTML(body)}</div>`;
          html += `</div>\n`;
        }
      }
      return html;
    }

    // Old Reddit
    const oldComments = this.querySelectorAll(".comment");
    if (oldComments.length > 0) {
      for (const comment of oldComments.slice(0, 20)) {
        const authorElement = comment.querySelector(".author");
        const author = this.getTextContent(authorElement) || "[deleted]";
        const body = comment.querySelector(".usertext-body");

        if (body) {
          html += `<div class="comment">`;
          html += `<div class="comment-header"><strong>${author}</strong></div>`;
          html += `<div class="comment-body">${this.getInnerHTML(body)}</div>`;
          html += `</div>\n`;
        }
      }
      return html;
    }

    return "";
  }

  private getSubreddit(): string {
    // Try URL first
    const urlMatch = this.url.match(/\/r\/([^/]+)/);
    if (urlMatch) return urlMatch[1];

    // Try DOM
    const subredditLink = this.querySelector('a[href^="/r/"]');
    if (subredditLink) {
      const href = this.getAttribute(subredditLink, "href") || "";
      const match = href.match(/\/r\/([^/]+)/);
      if (match) return match[1];
    }

    return "";
  }

  private getPostTitle(): string {
    // New Reddit (shreddit)
    const shredditTitle = this.querySelector("shreddit-post");
    if (shredditTitle) {
      return this.getAttribute(shredditTitle, "post-title") || "";
    }

    // New Reddit (React)
    const reactTitle = this.querySelector('[data-test-id="post-content"] h1');
    if (reactTitle) {
      return this.getTextContent(reactTitle);
    }

    // Old Reddit
    const oldTitle = this.querySelector(".title a.title");
    if (oldTitle) {
      return this.getTextContent(oldTitle);
    }

    // Fallback to document title
    return this.document.title?.replace(/ : .+$/, "") || "";
  }

  private getPostAuthor(): string {
    // New Reddit (shreddit)
    const shredditPost = this.querySelector("shreddit-post");
    if (shredditPost) {
      return this.getAttribute(shredditPost, "author") || "";
    }

    // New Reddit (React)
    const reactAuthor = this.querySelector('[data-test-id="post-content"] a[href*="/user/"]');
    if (reactAuthor) {
      return this.getTextContent(reactAuthor);
    }

    // Old Reddit
    const oldAuthor = this.querySelector(".tagline .author");
    if (oldAuthor) {
      return this.getTextContent(oldAuthor);
    }

    return "";
  }

  private getPostDate(): string {
    // New Reddit (shreddit)
    const shredditPost = this.querySelector("shreddit-post");
    if (shredditPost) {
      const created = this.getAttribute(shredditPost, "created-timestamp");
      if (created) {
        return created.split("T")[0] || "";
      }
    }

    // Try time element
    const timeElement = this.querySelector("time");
    if (timeElement) {
      const datetime = this.getAttribute(timeElement, "datetime");
      if (datetime) {
        return datetime.split("T")[0] || "";
      }
    }

    return "";
  }
}
