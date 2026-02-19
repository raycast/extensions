import { Detail, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";

export interface ResourceDetailViewProps {
  /** The URL of the resource to fetch and display */
  url: string;
  /** The title to display in the detail view */
  title: string;
  /** The resource filename for error messages (e.g., "robots.txt", "sitemap.xml") */
  resourceName?: string;
  /** Whether to render the content as markdown (true) or in a code block (false) */
  renderAsMarkdown?: boolean;
}

/**
 * Component that fetches and displays a resource in a Detail view
 * Can render content either as raw markdown or in a fenced code block
 *
 * @example
 * ```tsx
 * // Render as code block (default)
 * <ResourceDetailView url="https://example.com/robots.txt" title="Robots.txt" />
 *
 * // Render as markdown
 * <ResourceDetailView url="https://example.com/llms.txt" title="LLMs.txt" renderAsMarkdown />
 * ```
 */
export function ResourceDetailView({ url, title, resourceName, renderAsMarkdown = false }: ResourceDetailViewProps) {
  const { data, isLoading, error } = useFetch<string>(url, {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      return response.text();
    },
  });

  let markdown: string;
  if (error) {
    // Extract just the error message without stack trace
    const errorMessage = error.message || String(error);
    const cleanMessage = errorMessage.split("\n")[0]; // Get first line only

    // Use resourceName if provided, otherwise fall back to title
    const displayName = resourceName || title;

    markdown = `# Can't access ${displayName}\n\n${cleanMessage}\n\n---\n\nThis resource may be protected by the server or may not exist. Try opening it in your browser to see if you can access it directly.`;
  } else if (data) {
    if (renderAsMarkdown) {
      markdown = `# ${title}\n\n${data}`;
    } else {
      markdown = `# ${title}\n\n\`\`\`\n${data}\n\`\`\``;
    }
  } else {
    markdown = `Loading ${title}...`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        error ? (
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={url}
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={url}
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
