import { Action, ActionPanel, Detail, Icon, Toast, getSelectedText, popToRoot, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { encode } from "./tiktoken";

export default function Command() {
  const { isLoading, data, error } = usePromise(async () => {
    const selectedText = await getSelectedText();
    const { tokens, encoding } = encode(selectedText);
    const encodedTokens: string = JSON.stringify(tokens) ?? "";
    const shouldTruncate = selectedText.length > 240;

    const md = !selectedText
      ? "no selected text"
      : `### Selected Text ${shouldTruncate ? "Preview" : ""}
  \`\`\`
  ${shouldTruncate ? selectedText.substring(0, 200) + "..." : selectedText ?? ""}
  \`\`\`
  ### Encoding Result
\`\`\`
${encodedTokens}
\`\`\``;

    return { tokens, encoding, selectedText, md, encodedTokens };
  }, []);

  if (error) {
    showToast({
      title: "No Selected Text",
      message: String(error),
      style: Toast.Style.Failure,
    });
    return popToRoot();
  }

  return (
    data && (
      <Detail
        isLoading={isLoading}
        markdown={data.md}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Tokens" text={String(data.tokens.length)} icon={Icon.Hashtag} />
            <Detail.Metadata.Label title="Text Length" text={String(data.selectedText.length)} icon={Icon.Hashtag} />
            <Detail.Metadata.Label title="Encoding" text={data.encoding} icon={Icon.Lock} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={data.encodedTokens} />
          </ActionPanel>
        }
      />
    )
  );
}
