import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";

import { CreateVariationRequest } from "../hooks/useOpenAIApi";
import downloadTempFile from "../lib/downloadTempFile";
import { copyFileAction, ImagesGrid } from "./ImagesGrid";

export function ImageDetails(props: {
  url: string;
  opt: CreateVariationRequest & { prompt: string; variationCount?: number };
}) {
  const { url, opt } = props;

  const { push } = useNavigation();
  async function createVariationAction(url: string, count: number) {
    const file = await downloadTempFile(url);
    push(
      <ImagesGrid prompt={opt.prompt} file={file} n={opt.n.toString()} size={opt.size} variationCount={count + 1} />
    );
  }

  return (
    <Detail
      markdown={`![](${props.url})`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Copy Image" icon={Icon.Clipboard} onAction={() => copyFileAction(url)} />
            <Action.CopyToClipboard title="Copy URL" icon={Icon.Link} content={url} />
            <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.NewDocument}
              title="Create Variation(s)"
              onAction={() => createVariationAction(url, opt.variationCount ?? 0)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={opt.prompt} />
          <Detail.Metadata.Label title="Size" text={opt.size} />
          <Detail.Metadata.Label
            title="Variation"
            text={opt.variationCount ? opt.variationCount.toString() : "Original"}
          />
        </Detail.Metadata>
      }
    />
  );
}
