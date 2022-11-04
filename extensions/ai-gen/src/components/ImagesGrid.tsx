import { useEffect } from "react";

import { Action, ActionPanel, Clipboard, Grid, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";

import { CreateImageValues } from "../components/CreateImage";
import useOpenAIApi from "../hooks/useOpenAIApi";
import copyFileToClipboard from "../lib/copyFileToClipboard";

const NUM_ROWS = 2;
const MIN_COLS = 3;

export function ImagesGrid(props: CreateImageValues) {
  const { prompt, n, size } = props;
  const [results, createImage, isLoading] = useOpenAIApi({ apiKey: getPreferenceValues()["apiKey"] });

  useEffect(() => {
    createImage({ prompt, size, n: parseInt(n, 10) });
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
      searchBarPlaceholder={prompt}
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
                  <Action title="Copy Image" icon={Icon.Clipboard} onAction={() => copyFileAction(urlString)} />
                  <Action.CopyToClipboard title="Copy URL" icon={Icon.Link} content={urlString} />
                  <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={urlString} />
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
