import { BaseExtractor, ExtractorResult, ExtractorDocument, ExtractorElement } from "./_base";

/**
 * Extractor for GitHub (github.com)
 *
 * Handles:
 * - Issues with comments
 * - Pull Requests with comments
 * - README files
 * - Discussions
 */
export class GitHubExtractor extends BaseExtractor {
  private pageType: "issue" | "pr" | "readme" | "discussion" | "unknown";

  constructor(document: ExtractorDocument, url: string, schemaOrgData?: Record<string, unknown> | null) {
    super(document, url, schemaOrgData);
    this.pageType = this.detectPageType();
  }

  get siteName(): string {
    const repoInfo = this.extractRepoInfo();
    if (repoInfo.owner && repoInfo.repo) {
      return `GitHub - ${repoInfo.owner}/${repoInfo.repo}`;
    }
    return "GitHub";
  }

  private detectPageType(): "issue" | "pr" | "readme" | "discussion" | "unknown" {
    if (this.url.includes("/issues/")) return "issue";
    if (this.url.includes("/pull/")) return "pr";
    if (this.url.includes("/discussions/")) return "discussion";
    if (this.querySelector('[data-testid="issue-viewer-issue-container"]')) return "issue";
    if (this.querySelector("#readme")) return "readme";
    return "unknown";
  }

  canExtract(): boolean {
    // Can extract issues, PRs, or READMEs
    return (
      this.pageType === "issue" ||
      this.pageType === "pr" ||
      this.pageType === "readme" ||
      !!this.querySelector(".markdown-body")
    );
  }

  extract(): ExtractorResult {
    if (this.pageType === "issue" || this.pageType === "pr") {
      return this.extractIssueOrPR();
    }
    return this.extractReadme();
  }

  private extractIssueOrPR(): ExtractorResult {
    let content = "";

    // Extract main issue/PR body
    const issueContainer = this.querySelector('[data-testid="issue-viewer-issue-container"]');
    if (issueContainer) {
      const issueAuthor = this.extractAuthor(issueContainer, [
        'a[data-testid="issue-body-header-author"]',
        ".IssueBodyHeaderAuthor-module__authorLoginLink--_S7aT",
        ".ActivityHeader-module__AuthorLink--iofTU",
        'a[href*="/users/"][data-hovercard-url*="/users/"]',
      ]);

      const issueTimeElement = issueContainer.querySelector("relative-time");
      const issueTimestamp = this.getAttribute(issueTimeElement, "datetime") || "";

      const issueBodyElement = issueContainer.querySelector('[data-testid="issue-body-viewer"] .markdown-body');

      if (issueBodyElement) {
        const bodyContent = this.cleanBodyContent(issueBodyElement);

        content += `<div class="issue-author"><strong>${issueAuthor}</strong>`;
        if (issueTimestamp) {
          content += ` opened this ${this.pageType === "pr" ? "pull request" : "issue"} on ${this.formatDate(issueTimestamp)}`;
        }
        content += `</div>\n\n`;
        content += `<div class="issue-body">${bodyContent}</div>\n\n`;
      }
    }

    // Extract comments
    const commentElements = this.querySelectorAll("[data-wrapper-timeline-id]");
    const processedComments = new Set<string>();

    for (const commentElement of commentElements) {
      const commentContainer = commentElement.querySelector(".react-issue-comment");
      if (!commentContainer) continue;

      const commentId = this.getAttribute(commentElement, "data-wrapper-timeline-id");
      if (!commentId || processedComments.has(commentId)) continue;
      processedComments.add(commentId);

      const author = this.extractAuthor(commentContainer, [
        ".ActivityHeader-module__AuthorLink--iofTU",
        'a[data-testid="avatar-link"]',
        'a[href^="/"][data-hovercard-url*="/users/"]',
      ]);

      const timeElement = commentContainer.querySelector("relative-time");
      const timestamp = this.getAttribute(timeElement, "datetime") || "";

      const bodyElement = commentContainer.querySelector(".markdown-body");

      if (bodyElement) {
        const bodyContent = this.cleanBodyContent(bodyElement);

        if (bodyContent) {
          content += `<div class="comment">\n`;
          content += `<div class="comment-header"><strong>${author}</strong>`;
          if (timestamp) {
            content += ` commented on ${this.formatDate(timestamp)}`;
          }
          content += `</div>\n`;
          content += `<div class="comment-body">${bodyContent}</div>\n`;
          content += `</div>\n\n`;
        }
      }
    }

    const textContent = this.stripHtml(content);

    return {
      content,
      textContent,
      metadata: {
        title: this.getTitle(),
        author: this.extractFirstAuthor(),
        siteName: this.siteName,
        description: textContent.slice(0, 200).replace(/\s+/g, " ").trim(),
      },
    };
  }

  private extractReadme(): ExtractorResult {
    const readme = this.querySelector("#readme .markdown-body") || this.querySelector(".markdown-body");
    const content = readme ? this.cleanBodyContent(readme) : "";
    const textContent = this.stripHtml(content);

    return {
      content,
      textContent,
      metadata: {
        title: this.getTitle(),
        siteName: this.siteName,
        description: textContent.slice(0, 200).replace(/\s+/g, " ").trim(),
      },
    };
  }

  private extractAuthor(container: ExtractorElement, selectors: string[]): string {
    for (const selector of selectors) {
      const authorLink = container.querySelector(selector);
      if (authorLink) {
        const href = this.getAttribute(authorLink, "href");
        if (href) {
          if (href.startsWith("/")) {
            const username = href.substring(1).split("/")[0];
            if (username && !username.includes("?")) {
              return username;
            }
          } else if (href.includes("github.com/")) {
            const match = href.match(/github\.com\/([^/?#]+)/);
            if (match?.[1]) {
              return match[1];
            }
          }
        }
      }
    }
    return "Unknown";
  }

  private extractFirstAuthor(): string {
    const issueContainer = this.querySelector('[data-testid="issue-viewer-issue-container"]');
    if (issueContainer) {
      return this.extractAuthor(issueContainer, [
        'a[data-testid="issue-body-header-author"]',
        ".ActivityHeader-module__AuthorLink--iofTU",
      ]);
    }
    return "";
  }

  private cleanBodyContent(bodyElement: ExtractorElement): string {
    const clone = bodyElement.cloneNode(true) as ExtractorElement;

    // Remove interactive elements
    const removeSelectors = [
      "button",
      '[data-testid*="button"]',
      '[data-testid*="menu"]',
      ".js-clipboard-copy",
      ".zeroclipboard-container",
      ".octicon",
      ".anchor",
    ];

    for (const selector of removeSelectors) {
      const elements = clone.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    }

    return clone.innerHTML?.trim() || "";
  }

  private extractIssueNumber(): string {
    const urlMatch = this.url.match(/\/(issues|pull)\/(\d+)/);
    if (urlMatch) return urlMatch[2];

    const titleElement = this.querySelector("h1");
    const titleMatch = this.getTextContent(titleElement).match(/#(\d+)/);
    return titleMatch ? titleMatch[1] : "";
  }

  private extractRepoInfo(): { owner: string; repo: string } {
    const urlMatch = this.url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2] };
    }
    return { owner: "", repo: "" };
  }

  private getTitle(): string {
    // Try to get issue/PR title
    const issueTitle = this.querySelector('[data-testid="issue-title"]');
    if (issueTitle) {
      return this.getTextContent(issueTitle);
    }

    // Fall back to document title
    return this.document.title || "";
  }
}
