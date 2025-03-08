import { Link } from "@/types";
import { getLinkMarkdown } from "@/utils/content";
import { Action, ActionPanel, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";

type Props = {
  link: Link;
};

export default function LinkContent({ link }: Props) {
  const { data, isLoading, error } = usePromise(() => getLinkMarkdown(link.url.markdown));

  const markdown = error ? `# Error\n\nFailed to load content: ${error.message}` : data || "**Loading...**";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={link.title}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={error ? "Try Open in Browser" : "Open in Browser"} url={link.url.path} />
          <Action.CopyToClipboard title="Copy URL to Clipboard" content={link.url.path} />
        </ActionPanel>
      }
    />
  );
}
