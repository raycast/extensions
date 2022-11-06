import { CreateImageRequestSizeEnum } from "openai";
import { useEffect } from "react";

import { Action, ActionPanel, Clipboard, Grid, getPreferenceValues, Icon, showToast, Toast, useNavigation } from "@raycast/api";

import useOpenAIApi from "../hooks/useOpenAIApi";
import copyFileToClipboard from "../lib/copyFileToClipboard";
import downloadTempFile from "../lib/downloadTempFile";
import {ImageDetails} from "./ImageDetails";

const NUM_ROWS = 2;
const MIN_COLS = 3;

export type ImagesGridProps = {
  title?: string;
  n: string;
  size: CreateImageRequestSizeEnum;
} & (
  | { prompt: string; file?: never; }
  | { prompt?: never; file: string }
)

export function ImagesGrid(props: ImagesGridProps) {
  const { prompt, file, n, size } = props;
  const title = props.title || prompt;
  const number = parseInt(n, 10);

  const {apiKey} = getPreferenceValues();
  const [results, createImage, createVariation, isLoading] = useOpenAIApi({ apiKey });

  const { push } = useNavigation();
  async function createVariationAction(url: string) {
    const file = await downloadTempFile(url);
    push(<ImagesGrid title={title} file={file} n={n} size={size} />);
  }

  useEffect(() => {
    if (prompt) {
      createImage({ prompt, size, n: number });
    } else if (file) {
      createVariation(file, {n: number, size});
    }
  }, []);

  // Display any API search errors
  useEffect(() => {
    if (results?.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed creating images",
        message: results?.error.message,
      });
    }
  }, [results?.error]);

  return (
    <Grid
      columns={Math.max(MIN_COLS, Math.ceil((results.images?.length ?? 0) / NUM_ROWS))}
      enableFiltering={false}
      isLoading={isLoading}
      searchBarPlaceholder={file ? `Variation on "${title}"` : title}
    >
      {!results.images?.length || isLoading ? (
        <Grid.EmptyView />
      ) : (
        results.images?.map(({ url }, index) => {
          const urlString = url ?? "";
          return (
            <Grid.Item
              key={index}
              content={{ source: urlString }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Copy Image" icon={Icon.Clipboard} onAction={() => copyFileAction(urlString)} />
                    <Action.CopyToClipboard title="Copy URL" icon={Icon.Link} content={urlString} />
                    <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={urlString} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push title="View Details" icon={Icon.Eye} target={<ImageDetails url={urlString} opt={{ title: title, n: number, size: props.size }} />} />
                    <Action title="Create Variation(s)" icon={Icon.NewDocument} onAction={() => createVariationAction(urlString)} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </Grid>
  );
}

function copyFileAction(url: string) {
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
