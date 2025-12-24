import { ActionPanel, Action, Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { parse } from "node-html-parser";
import { SearchResult } from "../types/search";
import { buildUrlWithoutAnchor, hasAnchor, extractAnchor, buildUrlWith } from "../helpers/url";
import { htmlToMarkdown } from "../helpers/markdown";

export function DocumentationDetail({ result }: { result: SearchResult }) {
  const { data: html, isLoading } = useFetch<string>(buildUrlWithoutAnchor(result.path), {
    parseResponse: async (response: Response) => await response.text(),
  });

  const markdown = useMemo(() => {
    if (!html) return "";

    try {
      const doc = parse(html);
      const anchor = hasAnchor(result.path) ? extractAnchor(result.path) : null;

      let markdown = "";

      if (anchor) {
        const element = doc.getElementById(anchor);
        const methodElement = element?.parentNode;

        if (methodElement) {
          markdown += `# ${result.name}\n\n`;
          markdown += `**Module:** ${result.type}\n\n`;

          const klass = doc.getElementById("content")?.querySelector(".type")?.nextElementSibling?.innerText;
          if (klass) {
            markdown += `**Class:** ${klass}\n\n`;
          }

          const descriptionElement = methodElement.querySelector(".description")?.innerHTML;
          if (descriptionElement && descriptionElement.trim() !== "") {
            const description = htmlToMarkdown(descriptionElement, result.path);
            markdown += `## Description\n\n${description}\n\n`;
          }

          const sourceLinkElement = methodElement.querySelector(".source-link");
          const sourceLink = sourceLinkElement?.innerHTML;
          if (sourceLink && sourceLink.match(/show/)) {
            const sourceCode = methodElement.querySelector(".dyn-source");
            if (sourceCode) {
              const code = htmlToMarkdown(sourceCode.innerHTML, result.path);
              markdown += `## Source Code\n\n${code}\n\n`;
            }
          }
        } else {
          markdown += `# ${result.name}\n\nMethod section not found in documentation.`;
        }
      } else {
        markdown += `# ${result.name}\n\nNo method section.`;
      }

      return markdown || "Documentation not found";
    } catch {
      return "Error loading documentation. Please open in browser.";
    }
  }, [html, result]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={buildUrlWith(result.path)} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={buildUrlWith(result.path)}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
