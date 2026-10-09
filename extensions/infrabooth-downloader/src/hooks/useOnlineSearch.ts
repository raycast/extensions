import { useCachedPromise } from "@raycast/utils";
import { extractSoundCloudLink } from "../lib/downloadLink";
import { handleError } from "../lib/feedback";
import { fetchOnlineResults, type OnlineSearchResults } from "../lib/onlineSearch";
import type { ResolvedLink } from "../lib/resolveLink";
import { useLinkPreview } from "./useLinkPreview";

export type OnlineView =
  | { mode: "idle" }
  | { mode: "link"; link: string; resolved: ResolvedLink | undefined; error: string | undefined }
  | { mode: "search"; query: string; results: OnlineSearchResults | undefined };

export interface OnlineSearch {
  view: OnlineView;
  isLoading: boolean;
}

export function useOnlineSearch(query: string, remoteQuery: string, enabled: boolean): OnlineSearch {
  const link = enabled ? extractSoundCloudLink(query) : undefined;
  const preview = useLinkPreview(link ?? "");
  const canSearch = enabled && remoteQuery !== "" && extractSoundCloudLink(remoteQuery) === undefined;
  const search = useCachedPromise(fetchOnlineResults, [remoteQuery], {
    execute: canSearch,
    keepPreviousData: true,
    onError: (error) => void handleError(error, "Search failed"),
  });

  if (link) {
    return {
      view: { mode: "link", link, resolved: preview.resolved, error: preview.error },
      isLoading: preview.isLoading,
    };
  }
  if (query === "") return { view: { mode: "idle" }, isLoading: false };
  return {
    view: { mode: "search", query: remoteQuery, results: canSearch ? search.data : undefined },
    isLoading: query !== remoteQuery || (canSearch && search.isLoading),
  };
}
