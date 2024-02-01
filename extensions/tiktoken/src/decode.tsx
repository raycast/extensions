import { Action, ActionPanel, Detail, Icon, Toast, getSelectedText, popToRoot, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { decode } from "./tiktoken";

export default function Command() {
  const { isLoading, data, error } = usePromise(async () => {
    const selectedText = await getSelectedText();
    const encodingResult: number[] = JSON.parse(selectedText);

    if (!Array.isArray(encodingResult)) {
      await showToast({
        title: "Error",
        message: "selection should be an array of numbers",
        style: Toast.Style.Failure,
      });
      popToRoot();
    }

    const { text, encoding } = decode(encodingResult);
    const shouldTruncate = encodingResult.length > 60;

    const md = `### Selected Encoding ${shouldTruncate ? "Preview" : ""}
  \`\`\`
  ${shouldTruncate ? JSON.stringify(encodingResult.slice(0, 40)) + "..." : JSON.stringify(encodingResult) ?? ""}
  \`\`\`
  ### Decoding Result
\`\`\`
${text}
\`\`\``;

    return { tokens: encodingResult, encoding, text, md };
  }, []);

  if (error) {
    showToast({
      title: "No Selected Text",
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
            <Detail.Metadata.Label title="Text Length" text={String(data.text.length)} icon={Icon.Hashtag} />
            <Detail.Metadata.Label title="Encoding" text={data.encoding} icon={Icon.Lock} />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Result" content={data.text} />
          </ActionPanel>
        }
      />
    )
  );
}
