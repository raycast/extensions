import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";
import { getDetail } from "./api";

interface SearchArguments {
  url: string;
}

export default function GenCommand(
  props: LaunchProps<{ arguments: SearchArguments }>,
) {
  const url = props.arguments.url ?? props.fallbackText;

  const { data, isLoading } = getDetail(url);

  const format = data?.format
    ?.replace(/\[img\](.*?)\[\/img\]/, '<img src="$1" width="100" />')
    .replace(/\n/g, "  \n");

  const titleMatch = data?.format?.match(/◎片\s+名\s+(.+?)\n/);
  const title = isLoading
    ? "Loading..."
    : titleMatch
      ? titleMatch[1]
      : "未知标题";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={format}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={data?.format ?? ""}
          />
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
        </ActionPanel>
      }
    />
  );
}
