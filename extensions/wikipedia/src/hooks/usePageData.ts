import { popToRoot, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import wiki from "wikijs";

import { getApiOptions, getApiUrl, type PageMetadata, PageSummary, WikiNode } from "@/utils/api";

export function usePageSummary(title: string, language: string, onError?: (error: Error) => void) {
  return useFetch<PageSummary>(`${getApiUrl(language)}api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
    headers: getApiOptions(language)?.headers,
    onError,
  });
}

function usePageContent(title: string, language: string) {
  return useCachedPromise(
    (title: string, language: string) =>
      wiki({
        apiUrl: `${getApiUrl(language)}w/api.php`,
        headers: getApiOptions(language)?.headers,
      })
        .page(title)
        .then((page) => {
          return page.content() as unknown as WikiNode[];
        })
        .catch(() => []),
    [title, language],
  );
}

function usePageMetadata(title: string, language: string) {
  return useCachedPromise(
    (title: string, language: string) =>
      wiki({
        apiUrl: `${getApiUrl(language)}w/api.php`,
        headers: getApiOptions(language)?.headers,
      })
        .page(title)
        .then((page) => {
          return page.fullInfo() as Promise<{ general?: PageMetadata }>;
        })
        .then((data) => (data.general ?? {}) as PageMetadata)
        .catch(() => {}),
    [title, language],
  );
}

function usePageLinks(title: string, language: string) {
  return useCachedPromise(
    (title: string, language: string) =>
      wiki({
        apiUrl: `${getApiUrl(language)}w/api.php`,
        headers: getApiOptions(language)?.headers,
      })
        .page(title)
        .then((page) => page.links())
        .catch(() => [] as string[]),
    [title, language],
  );
}

export function useAvailableLanguages(title: string, language: string) {
  return useCachedPromise(
    (title: string, language: string) =>
      wiki({
        apiUrl: `${getApiUrl(language)}w/api.php`,
        headers: getApiOptions(language)?.headers,
      })
        .page(title)
        .then((page) => page.langlinks())
        .catch(() => [{ lang: language, title }]),
    [title, language],
  );
}

export function usePageData(title: string, language: string) {
  const { data: page, isLoading: isLoadingPage } = usePageSummary(title, language, () => {
    showToast({
      title: "Page not found",
      message: title,
      style: Toast.Style.Failure,
    });
    popToRoot();
  });
  const { data: content, isLoading: isLoadingContent } = usePageContent(title, language);
  const { data: metadata, isLoading: isLoadingMetadata } = usePageMetadata(title, language);
  const { data: links, isLoading: isLoadingLinks } = usePageLinks(title, language);

  const isLoading = isLoadingPage || isLoadingContent || isLoadingMetadata || isLoadingLinks;

  return { page, content, metadata, links, isLoading };
}
