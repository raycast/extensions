import { usePromise } from "@raycast/utils";
import { imageMarkdown } from "../lib/preview";
import { previewPng } from "../lib/render";
import { IconSettings } from "../lib/settings";

export function useIconPreview(settings: IconSettings, size = 320) {
  const { data, isLoading, error } = usePromise(previewPng, [settings]);
  return {
    isLoading,
    markdown: error
      ? "The icon preview could not be rendered. Check your SVG and settings."
      : data
        ? imageMarkdown(data, "Icon", size)
        : "Rendering preview…",
  };
}
