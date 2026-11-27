import {
  Action,
  ActionPanel,
  type Image,
  type LaunchProps,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { copyPngToClipboard } from "./clipboard";
import { FormulaRenderError, renderPng, renderPreview } from "./render";

const PREVIEW_DEBOUNCE_MS = 500;

export default function QuickMathCommand({ arguments: args }: LaunchProps<{ arguments: Arguments.QuickMath }>) {
  const { renderer, preamble } = getPreferenceValues<Preferences.QuickMath>();
  const engine = renderer === "typst" ? "Typst" : "LaTeX";
  const [searchText, setSearchText] = useState(args.latex ?? "");
  const [previewImage, setPreviewImage] = useState<Image.ImageLike>();
  const [previewError, setPreviewError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    setIsLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const image = await renderPreview(searchText, { renderer, preamble }, signal);
        if (signal.aborted) return;

        setPreviewImage(image);
        setPreviewError(undefined);
      } catch (error) {
        if (!signal.aborted) {
          setPreviewError(getErrorMessage(error));
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      abortController.abort();
    };
  }, [searchText, renderer, preamble]);

  async function copyFormula() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Rendering ${engine}`,
    });

    try {
      const png = await renderPng(searchText, { renderer, preamble });
      await copyPngToClipboard(png);
      toast.style = Toast.Style.Success;
      toast.title = "Copied transparent PNG";
      await popToRoot();
      await showHUD("Copied transparent PNG to clipboard.");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not render ${engine}`;
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder={`Type a ${engine} formula`}
    >
      <List.EmptyView
        icon={previewImage}
        title={previewError ? "Preview not updated" : undefined}
        description={previewError}
        actions={
          <ActionPanel>
            <Action title="Copy as PNG" onAction={copyFormula} />
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof FormulaRenderError) {
    return [error.message, error.detail].filter(Boolean).join(" ");
  }

  return error instanceof Error ? error.message : "An unexpected rendering error occurred.";
}
