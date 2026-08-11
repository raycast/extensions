import { ActionPanel, Action, Detail, useNavigation, Icon } from "@raycast/api";
import { copyImageToClipboard, saveImageToDownloads } from "../utils";

interface ResultViewProps {
  url: string;
  e1: string;
  e2: string;
  filename?: string;
  onReset: () => void;
}

export function ResultView({ url, e1, e2, filename, onReset }: ResultViewProps) {
  const { pop } = useNavigation();
  const name = filename ?? `emoji_mashup`;

  const markdown = `# ${e1} + ${e2}\n\n<img src="${url}" alt="${e1} + ${e2}" width="250" />`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${e1} + ${e2}`}
      actions={
        <ActionPanel>
          <Action title="Copy Image" icon={Icon.CopyClipboard} onAction={() => copyImageToClipboard(url, name)} />
          <Action
            title="Save to Downloads"
            icon={Icon.Download}
            onAction={() => saveImageToDownloads(url, name)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action.CopyToClipboard title="Copy Image URL" content={url} />
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy Emoji Combination" content={`${e1}${e2}`} />
          <Action
            title="Mix More"
            onAction={() => {
              onReset();
              pop();
            }}
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
    />
  );
}
