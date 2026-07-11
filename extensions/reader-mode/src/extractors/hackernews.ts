import { BaseExtractor, ExtractorResult, ExtractorDocument, ExtractorElement } from "./_base";

/**
 * Extractor for Hacker News (news.ycombinator.com)
 *
 * Handles:
 * - Story pages with comments
 * - Individual comment permalinks
 * - Ask HN / Show HN posts
 */
export class HackerNewsExtractor extends BaseExtractor {
  private mainPost: ExtractorElement | null;
  private isCommentPage: boolean;
  private mainComment: ExtractorElement | null;

  constructor(document: ExtractorDocument, url: string, schemaOrgData?: Record<string, unknown> | null) {
    super(document, url, schemaOrgData);
    this.mainPost = this.querySelector(".fatitem");
    this.isCommentPage = this.detectCommentPage();
    this.mainComment = this.isCommentPage ? this.findMainComment() : null;
  }

  get siteName(): string {
    return "Hacker News";
  }

  private detectCommentPage(): boolean {
    return !!this.mainPost?.querySelector('.navs a[href*="parent"]');
  }

  private findMainComment(): ExtractorElement | null {
    return this.mainPost?.querySelector(".comment") ?? null;
  }

  canExtract(): boolean {
    return !!this.mainPost;
  }

  extract(): ExtractorResult {
    const postContent = this.getPostContent();
    const comments = this.extractComments();
    const contentHtml = this.createContentHtml(postContent, comments);
    const textContent = this.stripHtml(contentHtml);

    return {
      content: contentHtml,
      textContent,
      metadata: {
        title: this.getPostTitle(),
        author: this.getPostAuthor(),
        siteName: this.siteName,
        description: this.createDescription(),
        published: this.getPostDate(),
      },
    };
  }

  private createContentHtml(postContent: string, comments: string): string {
    let html = `<div class="hackernews-post">`;
    html += `<div class="post-content">${postContent}</div>`;

    if (comments) {
      html += `<hr><h2>Comments</h2>`;
      html += `<div class="hackernews-comments">${comments}</div>`;
    }

    html += `</div>`;
    return html;
  }

  private getPostContent(): string {
    if (!this.mainPost) return "";

    // Comment permalink page
    if (this.isCommentPage && this.mainComment) {
      const author = this.getTextContent(this.mainComment.querySelector(".hnuser")) || "[deleted]";
      const commentText = this.getInnerHTML(this.mainComment.querySelector(".commtext"));
      const timeElement = this.mainComment.querySelector(".age");
      const timestamp = this.getAttribute(timeElement, "title") || "";
      const date = timestamp.split("T")[0] || "";
      const points = this.getTextContent(this.mainComment.querySelector(".score"));
      const parentUrl = this.getAttribute(this.mainPost.querySelector('.navs a[href*="parent"]'), "href");

      let html = `<div class="comment main-comment">`;
      html += `<div class="comment-metadata">`;
      html += `<strong>${author}</strong>`;
      if (date) html += ` • ${date}`;
      if (points) html += ` • ${points}`;
      if (parentUrl) html += ` • <a href="https://news.ycombinator.com/${parentUrl}">parent</a>`;
      html += `</div>`;
      html += `<div class="comment-content">${commentText}</div>`;
      html += `</div>`;
      return html;
    }

    // Regular story page
    const titleRow = this.mainPost.querySelector("tr.athing");
    const storyUrl = this.getAttribute(titleRow?.querySelector(".titleline a") ?? null, "href") || "";

    let content = "";

    // External link
    if (storyUrl && !storyUrl.startsWith("item?")) {
      content += `<p><a href="${storyUrl}" target="_blank">${storyUrl}</a></p>`;
    }

    // Self-post text (Ask HN, Show HN, etc.)
    const toptext = this.mainPost.querySelector(".toptext");
    if (toptext) {
      content += `<div class="post-text">${this.getInnerHTML(toptext)}</div>`;
    }

    return content;
  }

  private extractComments(): string {
    const comments = this.querySelectorAll("tr.comtr");
    if (comments.length === 0) return "";

    let html = "";
    const processedIds = new Set<string>();
    let currentDepth = -1;
    const blockquoteStack: number[] = [];

    for (const comment of comments) {
      const id = this.getAttribute(comment, "id");
      if (!id || processedIds.has(id)) continue;
      processedIds.add(id);

      const indentImg = comment.querySelector(".ind img");
      const indent = parseInt(this.getAttribute(indentImg, "width") || "0", 10);
      const depth = Math.floor(indent / 40);

      const commentText = comment.querySelector(".commtext");
      if (!commentText) continue;

      const author = this.getTextContent(comment.querySelector(".hnuser")) || "[deleted]";
      const timeElement = comment.querySelector(".age");
      const timestamp = this.getAttribute(timeElement, "title") || "";
      const date = timestamp.split("T")[0] || "";
      const points = this.getTextContent(comment.querySelector(".score"));
      const commentUrl = `https://news.ycombinator.com/item?id=${id}`;

      // Handle nesting with blockquotes
      if (depth === 0) {
        while (blockquoteStack.length > 0) {
          html += "</blockquote>";
          blockquoteStack.pop();
        }
        html += "<blockquote>";
        blockquoteStack.push(0);
        currentDepth = 0;
      } else if (depth < currentDepth) {
        while (blockquoteStack.length > 0 && blockquoteStack[blockquoteStack.length - 1] >= depth) {
          html += "</blockquote>";
          blockquoteStack.pop();
        }
      } else if (depth > currentDepth) {
        html += "<blockquote>";
        blockquoteStack.push(depth);
      }

      html += `<div class="comment">`;
      html += `<div class="comment-metadata">`;
      html += `<strong>${author}</strong>`;
      html += ` • <a href="${commentUrl}">${date}</a>`;
      if (points) html += ` • ${points}`;
      html += `</div>`;
      html += `<div class="comment-content">${this.getInnerHTML(commentText)}</div>`;
      html += `</div>`;

      currentDepth = depth;
    }

    // Close remaining blockquotes
    while (blockquoteStack.length > 0) {
      html += "</blockquote>";
      blockquoteStack.pop();
    }

    return html;
  }

  private getPostId(): string {
    const match = this.url.match(/id=(\d+)/);
    return match?.[1] || "";
  }

  private getPostTitle(): string {
    if (this.isCommentPage && this.mainComment) {
      const author = this.getTextContent(this.mainComment.querySelector(".hnuser")) || "[deleted]";
      const commentText = this.getTextContent(this.mainComment.querySelector(".commtext"));
      const preview = commentText.slice(0, 50) + (commentText.length > 50 ? "..." : "");
      return `Comment by ${author}: ${preview}`;
    }
    return this.getTextContent(this.mainPost?.querySelector(".titleline") ?? null);
  }

  private getPostAuthor(): string {
    return this.getTextContent(this.mainPost?.querySelector(".hnuser") ?? null);
  }

  private createDescription(): string {
    const title = this.getPostTitle();
    const author = this.getPostAuthor();
    if (this.isCommentPage) {
      return `Comment by ${author} on Hacker News`;
    }
    return `${title} - by ${author} on Hacker News`;
  }

  private getPostDate(): string {
    const timeElement = this.mainPost?.querySelector(".age") ?? null;
    const timestamp = this.getAttribute(timeElement, "title") || "";
    return timestamp.split("T")[0] || "";
  }
}
