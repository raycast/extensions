import { CreateImageRequestSizeEnum } from "openai";

import { Action, ActionPanel, Clipboard, Icon, showToast, Toast, useNavigation } from "@raycast/api";

import { ImagesGrid } from "./ImagesGrid";
import { ImageDetails } from "./ImageDetails";

import downloadTempFile from "../lib/downloadTempFile";
import copyFileToClipboard from "../lib/copyFileToClipboard";

type ImageActionProps = {
  url: string;
  prompt: string;
  size: CreateImageRequestSizeEnum;
  n: string;
  variationCount: number;
  showDetailAction?: boolean;
};

export function ImageActions(props: ImageActionProps) {
  const { url, prompt, n, size, variationCount, showDetailAction } = props;
  const number = parseInt(n, 10);

  const { push } = useNavigation();
  async function createVariationAction(url: string, count: number) {
    const file = await downloadTempFile(url);
    push(<ImagesGrid prompt={prompt} file={file} n={n} size={size} variationCount={count + 1} />);
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Copy Image" icon={Icon.Clipboard} onAction={() => copyFileAction(url)} />
        <Action.CopyToClipboard title="Copy URL" icon={Icon.Link} content={url} />
        <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={url} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Create Variation(s)"
          icon={Icon.NewDocument}
          onAction={() => createVariationAction(url, variationCount)}
        />
        {showDetailAction && (
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<ImageDetails url={url} opt={{ prompt, n: number, size: props.size, variationCount }} />}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function copyFileAction(url: string) {
  showToast({
    style: Toast.Style.Animated,
    title: "Copying...",
  })
    .then(() => {
      return copyFileToClipboard(url).then(() => {
        return showToast({
          style: Toast.Style.Success,
          title: "Copied image to clipboard",
        });
      });
    })
    .catch((e: Error) =>
      showToast({
        style: Toast.Style.Failure,
        title: "Error, please try again",
        message: e?.message,
        primaryAction: {
          title: "Copy Error Message",
          onAction: (toast) => Clipboard.copy(toast.message ?? ""),
          shortcut: { modifiers: ["cmd"], key: "c" },
        },
      })
    );
}
