import { Action, ActionPanel, Detail, getPreferenceValues, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ResourceExportActions } from "../actions/ResourceExportActions";
import { Exportable, inferLanguage, inferRows, prettyPrint } from "../utils/exportUtils";

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

  const { prettyPrintCode } = getPreferenceValues<Preferences>();
  const name = resourceName || title;
  const language = inferLanguage(name, undefined);
  const resource: Exportable | undefined = data
    ? { name, text: data, rows: inferRows(name, data), language }
    : undefined;

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
      // A tagged fence gets syntax colouring in Raycast's Markdown renderer, so
      // a 17KB app-site-association reads as JSON instead of grey monospace.
      // Pretty-printing is display-only; `resource` below keeps the raw bytes.
      const body = prettyPrintCode ? prettyPrint(data, language) : data;
      markdown = `# ${title}\n\n\`\`\`${language}\n${body}\n\`\`\``;
    }
  } else {
    markdown = `Loading ${title}...`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ResourceExportActions resource={resource} />
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={url}
              icon={Icon.Globe}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            <Action.CopyToClipboard title="Copy URL" content={url} icon={Icon.Link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
