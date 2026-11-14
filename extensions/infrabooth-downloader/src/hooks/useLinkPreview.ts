import { useCachedPromise } from "@raycast/utils";
import { resolveLink } from "../lib/api";
import { resolveErrorMessage } from "../lib/downloadLink";
import { reportLoadError } from "../lib/feedback";
import { useDebouncedValue } from "./useDebouncedValue";

export function useLinkPreview(link: string) {
  const trimmed = link.trim();
  const query = useDebouncedValue(trimmed, 300);
  const preview = useCachedPromise(resolveLink, [query], {
    execute: query !== "",
    onError: (error) => reportLoadError(error, "link-preview"),
  });
  const isCurrent = query !== "" && query === trimmed;
  return {
    resolved: isCurrent ? preview.data : undefined,
    error: isCurrent && preview.error ? resolveErrorMessage(preview.error) : undefined,
    isLoading: trimmed !== "" && (!isCurrent || preview.isLoading),
  };
}
