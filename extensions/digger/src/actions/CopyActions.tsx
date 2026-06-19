import { Action, Icon, Keyboard } from "@raycast/api";
import { DiggerResult } from "../types";
import { formatBytes } from "../utils/formatters";

interface CopyActionsProps {
  data: DiggerResult;
  url: string;
}

export function CopyActions({ data, url }: CopyActionsProps) {
  const jsonContent = JSON.stringify(data, null, 2);
  const markdownContent = generateMarkdownReport(data);

  return (
    <>
      <Action.CopyToClipboard
        title="Copy URL"
        content={url}
        icon={Icon.Link}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.CopyToClipboard
        title="Copy as JSON"
        content={jsonContent}
        icon={Icon.Code}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
      />
      <Action.CopyToClipboard
        title="Copy as Markdown"
        content={markdownContent}
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      />
    </>
  );
}

interface CopyIndividualActionsProps {
  title?: string;
  description?: string;
  ogImage?: string;
  favicon?: string;
  canonical?: string;
}

export function CopyIndividualActions({ title, description, ogImage, favicon, canonical }: CopyIndividualActionsProps) {
  return (
    <>
      {title && (
        <Action.CopyToClipboard
          title="Copy Title"
          content={title}
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
        />
      )}
      {description && (
        <Action.CopyToClipboard
          title="Copy Description"
          content={description}
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd", "opt"], key: "d" }}
        />
      )}
      {ogImage && (
        <Action.CopyToClipboard
          title="Copy OG Image URL"
          content={ogImage}
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
        />
      )}
      {favicon && (
        <Action.CopyToClipboard
          title="Copy Favicon URL"
          content={favicon}
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "opt"], key: "f" }}
        />
      )}
      {canonical && (
        <Action.CopyToClipboard
          title="Copy Canonical URL"
          content={canonical}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
    </>
  );
}

function generateMarkdownReport(data: DiggerResult): string {
  const { overview, metadata, discoverability, resources, networking, performance } = data;

  let markdown = `# Website Analysis: ${overview?.title || data.url}\n\n`;

  if (overview?.description) {
    markdown += `${overview.description}\n\n`;
  }

  markdown += `**URL**: ${data.url}\n`;
  markdown += `**Analyzed**: ${new Date(data.fetchedAt).toLocaleString()}\n\n`;

  markdown += `---\n\n`;

  if (networking) {
    markdown += `## Response Details\n\n`;
    if (networking.statusCode) {
      markdown += `- **Status**: ${networking.statusCode}\n`;
    }
    if (networking.finalUrl) {
      markdown += `- **Final URL**: ${networking.finalUrl}\n`;
    }
    if (networking.server) {
      markdown += `- **Server**: ${networking.server}\n`;
    }
    if (performance?.loadTime) {
      markdown += `- **Response Time**: ${Math.round(performance.loadTime)}ms\n`;
    }
    markdown += `\n`;
  }

  if (overview) {
    markdown += `## Overview\n\n`;
    if (overview.title) {
      markdown += `- **Title**: ${overview.title}\n`;
    }
    if (overview.description) {
      markdown += `- **Description**: ${overview.description}\n`;
    }
    if (overview.language) {
      markdown += `- **Language**: ${overview.language}\n`;
    }
    if (overview.charset) {
      markdown += `- **Charset**: ${overview.charset}\n`;
    }
    if (overview.favicon) {
      markdown += `- **Favicon**: ${overview.favicon}\n`;
    }
    markdown += `\n`;
  }

  if (metadata?.openGraph && Object.keys(metadata.openGraph).length > 0) {
    markdown += `## Open Graph Metadata\n\n`;
    Object.entries(metadata.openGraph).forEach(([key, value]) => {
      markdown += `- **${key}**: ${value}\n`;
    });
    markdown += `\n`;
  }

  if (metadata?.twitterCard && Object.keys(metadata.twitterCard).length > 0) {
    markdown += `## Twitter Card Metadata\n\n`;
    Object.entries(metadata.twitterCard).forEach(([key, value]) => {
      markdown += `- **${key}**: ${value}\n`;
    });
    markdown += `\n`;
  }

  if (discoverability) {
    markdown += `## Discoverability\n\n`;
    if (discoverability.canonical) {
      markdown += `- **Canonical URL**: ${discoverability.canonical}\n`;
    }
    if (discoverability.robots) {
      markdown += `- **Robots**: ${discoverability.robots}\n`;
    }
    if (discoverability.sitemap) {
      markdown += `- **Sitemap**: ${discoverability.sitemap}\n`;
    }
    if (discoverability.robotsTxt !== undefined) {
      markdown += `- **robots.txt**: ${discoverability.robotsTxt ? "Found" : "Not found"}\n`;
    }
    if (discoverability.llmsTxt !== undefined) {
      markdown += `- **llms.txt**: ${discoverability.llmsTxt ? "Found" : "Not found"}\n`;
    }
    if (discoverability.contentSignals) {
      const cs = discoverability.contentSignals;
      const parts: string[] = [];
      if (cs.search !== undefined) parts.push(`search=${cs.search}`);
      if (cs.aiInput !== undefined) parts.push(`ai-input=${cs.aiInput}`);
      if (cs.aiTrain !== undefined) parts.push(`ai-train=${cs.aiTrain}`);
      if (parts.length > 0) {
        markdown += `- **Content Signals**: ${parts.join(", ")}\n`;
      }
    }
    if (discoverability.paymentSignals?.detected) {
      const ps = discoverability.paymentSignals;
      const parts: string[] = [];
      if (ps.statusCode402) parts.push("HTTP 402");
      if (ps.paymentRequired) parts.push("PAYMENT-REQUIRED header");
      if (ps.paymentResponse) parts.push("PAYMENT-RESPONSE header");
      if (parts.length > 0) {
        markdown += `- **Payment Required (x402)**: ${parts.join(", ")}\n`;
      }
    }
    markdown += `\n`;
  }

  if (resources) {
    if (resources.stylesheets && resources.stylesheets.length > 0) {
      markdown += `## Stylesheets (${resources.stylesheets.length})\n\n`;
      resources.stylesheets.slice(0, 10).forEach((sheet) => {
        markdown += `- ${sheet.href}\n`;
      });
      if (resources.stylesheets.length > 10) {
        markdown += `- ... and ${resources.stylesheets.length - 10} more\n`;
      }
      markdown += `\n`;
    }

    if (resources.scripts && resources.scripts.length > 0) {
      markdown += `## Scripts (${resources.scripts.length})\n\n`;
      resources.scripts.slice(0, 10).forEach((script) => {
        markdown += `- ${script.src}\n`;
      });
      if (resources.scripts.length > 10) {
        markdown += `- ... and ${resources.scripts.length - 10} more\n`;
      }
      markdown += `\n`;
    }
  }

  if (performance) {
    markdown += `## Performance\n\n`;
    if (performance.loadTime) {
      markdown += `- **Load Time**: ${Math.round(performance.loadTime)}ms\n`;
    }
    if (performance.ttfb) {
      markdown += `- **TTFB**: ${Math.round(performance.ttfb)}ms\n`;
    }
    if (performance.pageSize) {
      markdown += `- **Page Size**: ${formatBytes(performance.pageSize)}\n`;
    }
    if (performance.requestCount) {
      markdown += `- **Requests**: ${performance.requestCount}\n`;
    }
    markdown += `\n`;
  }

  markdown += `---\n\n`;
  markdown += `*Generated by Digger*\n`;

  return markdown;
}
