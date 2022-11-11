import { CreateImageRequestSizeEnum } from "openai";
import { useEffect } from "react";

import { Grid, getPreferenceValues, showToast, Toast, useNavigation, Icon } from "@raycast/api";

import useOpenAIImageApi from "../hooks/useOpenAIImageApi";
import { ImageActions } from "./ImageActions";

const NUM_ROWS = 2;
const MIN_COLS = 3;

export type ImagesGridProps = {
  prompt: string;
  n: string;
  size: CreateImageRequestSizeEnum;
} & ({ file?: never; variationCount?: never } | { file: string; variationCount: number });

export function ImagesGrid(props: ImagesGridProps) {
  const { prompt, file, n, size, variationCount = 0 } = props;

  const title = file ? `Variation${variationCount > 1 ? ` ${variationCount}` : ""} on "${prompt}"` : prompt;
  const number = parseInt(n, 10);

  const { apiKey } = getPreferenceValues();
  const [results, createImage, createVariation, isLoading] = useOpenAIImageApi({ apiKey });

  useEffect(() => {
    if (prompt) {
      createImage({ prompt, size, n: number });
    } else if (file) {
      createVariation(file, { n: number, size });
    }
  }, []);

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
      isLoading={isLoading === undefined || isLoading}
      searchBarPlaceholder={title}
    >
      {!isLoading && (results.error?.message || results.images?.length === 0) ? (
        <Grid.EmptyView
          title={results?.error ? "Uh oh, something went wrong" : "No results"}
          description={results?.error ? "" : "Try re-working your prompt to be less-specific"}
          icon={results?.error ? Icon.ExclamationMark : null}
        />
      ) : (
        results.images?.map(({ url }, index) => {
          const urlString = url ?? "";
          return (
            <Grid.Item
              key={index}
              content={{ source: urlString }}
              actions={
                <ImageActions
                  showDetailAction={true}
                  url={urlString}
                  prompt={prompt}
                  size={size}
                  n={n}
                  variationCount={variationCount}
                />
              }
            />
          );
        })
      )}
    </Grid>
  );
}
