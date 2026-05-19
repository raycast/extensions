import { useCallback, useEffect, useRef, useState } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ArticleState } from "../types/article";
import { BrowserTab } from "../types/browser";
import { getArchiveSourceLabel } from "../config/labels";
import { getContentFromActiveTab, isBrowserExtensionAvailable } from "../utils/browser-extension";
import { urlLog } from "../utils/logger";
import { isValidUrl } from "../utils/url-resolver";
import { loadArticleFromUrl, loadArticleViaPaywallHopper, LoadArticleResult } from "../utils/article-loader";

const MINIMUM_ARTICLE_LENGTH = 100;

export interface UseRSVPArticleOptions {
  resolveUrl: () => Promise<{ url: string; source: string } | null>;
  onNoUrl?: () => void;
  commandName: string;
}

export interface RSVPArticleState {
  article: ArticleState | null;
  isLoading: boolean;
  error: string | null;
  blockedUrl: string | null;
  hasBrowserExtension: boolean;
  isWaitingForBrowser: boolean;
  foundTab: BrowserTab | null;
  notReadableUrl: string | null;
  emptyContentUrl: string | null;
  hasBrowserExtensionAvailable: boolean;
}

export interface RSVPArticleActions {
  handleFetchFromBrowser: () => Promise<void>;
  handleRetryWithoutCheck: () => Promise<void>;
  handleTryPaywallHopper: () => Promise<void>;
  handleUrlSubmit: (url: string) => Promise<void>;
}

interface Prefs {
  skipPreCheck: boolean;
  enablePaywallHopper: boolean;
}

export function useRSVPArticle(options: UseRSVPArticleOptions): RSVPArticleState & RSVPArticleActions {
  const { resolveUrl, onNoUrl, commandName } = options;
  const preferences = getPreferenceValues<Prefs>();

  const [article, setArticle] = useState<ArticleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [hasBrowserExtension, setHasBrowserExtension] = useState(false);
  const [isWaitingForBrowser, setIsWaitingForBrowser] = useState(false);
  const [foundTab, setFoundTab] = useState<BrowserTab | null>(null);

  const [notReadableUrl, setNotReadableUrl] = useState<string | null>(null);
  const [emptyContentUrl, setEmptyContentUrl] = useState<string | null>(null);

  const [hasBrowserExtensionAvailable, setHasBrowserExtensionAvailable] = useState(false);

  const fetchStartedRef = useRef(false);

  const handleLoadResult = useCallback(async (result: LoadArticleResult) => {
    if (result.status === "success") {
      setArticle(result.article);
      setBlockedUrl(null);
      setNotReadableUrl(null);
      setEmptyContentUrl(null);
      setError(null);

      if (result.article.archiveSource) {
        await showToast({
          style: Toast.Style.Success,
          title: "Paywall bypassed",
          message: `Retrieved via ${getArchiveSourceLabel(result.article.archiveSource.service)}`,
        });
      }
    } else if (result.status === "blocked") {
      setBlockedUrl(result.url);
      setHasBrowserExtension(result.hasBrowserExtension);
      setFoundTab(result.foundTab);
      setError(result.error);
    } else if (result.status === "not-readable") {
      setNotReadableUrl(result.url);
      setError(result.error);
    } else if (result.status === "empty-content") {
      setEmptyContentUrl(result.url);
      setError(result.error);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;

    (async () => {
      urlLog.log("session:start", { command: commandName });

      const urlResult = await resolveUrl();
      if (!urlResult) {
        urlLog.error("session:error", { reason: "no valid URL found" });
        if (onNoUrl) {
          onNoUrl();
        } else {
          setError("No valid URL found. Please provide one in your browser, clipboard, or as an argument.");
        }
        setIsLoading(false);
        return;
      }

      const result = await loadArticleFromUrl(urlResult.url, urlResult.source, {
        skipPreCheck: preferences.skipPreCheck,
        enablePaywallHopper: preferences.enablePaywallHopper,
        showArticleImage: true,
      });
      handleLoadResult(result);
    })();
  }, [resolveUrl, onNoUrl, commandName, preferences.skipPreCheck, preferences.enablePaywallHopper, handleLoadResult]);

  useEffect(() => {
    isBrowserExtensionAvailable().then(setHasBrowserExtensionAvailable);
  }, []);

  const handleFetchFromBrowser = useCallback(async () => {
    if (!blockedUrl) return;
    setIsWaitingForBrowser(true);
    setError(null);
    const result = await getContentFromActiveTab(blockedUrl);
    if (result.success) {
      setArticle(result.article);
      setBlockedUrl(null);
    } else {
      setError(result.error);
    }
    setIsWaitingForBrowser(false);
  }, [blockedUrl]);

  const handleRetryWithoutCheck = useCallback(async () => {
    if (!notReadableUrl) return;
    setIsLoading(true);
    setNotReadableUrl(null);
    setError(null);
    urlLog.log("session:retry-without-check", { url: notReadableUrl });
    const result = await loadArticleFromUrl(notReadableUrl, "retry", {
      skipPreCheck: true,
      enablePaywallHopper: preferences.enablePaywallHopper,
      showArticleImage: true,
    });
    handleLoadResult(result);
  }, [notReadableUrl, handleLoadResult, preferences.enablePaywallHopper]);

  const handleTryPaywallHopper = useCallback(async () => {
    if (!notReadableUrl) return;
    setIsLoading(true);
    setNotReadableUrl(null);
    setError(null);
    urlLog.log("session:try-paywall-hopper", { url: notReadableUrl });
    const result = await loadArticleViaPaywallHopper(notReadableUrl, { showArticleImage: true });
    if (result.status === "success") {
      handleLoadResult(result);
    } else {
      setError(result.error);
      setNotReadableUrl(notReadableUrl);
      setIsLoading(false);
    }
  }, [notReadableUrl, handleLoadResult]);

  const handleUrlSubmit = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setError(null);
      fetchStartedRef.current = false;
      urlLog.log("session:start", { argumentUrl: url, source: "form" });
      if (!isValidUrl(url)) {
        setError(`Invalid URL: "${url}"`);
        setIsLoading(false);
        return;
      }
      const result = await loadArticleFromUrl(url, "form", {
        skipPreCheck: preferences.skipPreCheck,
        enablePaywallHopper: preferences.enablePaywallHopper,
        showArticleImage: true,
      });
      handleLoadResult(result);
    },
    [preferences.skipPreCheck, preferences.enablePaywallHopper, handleLoadResult],
  );

  const hasMinimalContent = article && article.bodyMarkdown.trim().length < MINIMUM_ARTICLE_LENGTH;

  return {
    article: hasMinimalContent ? null : article,
    isLoading,
    error,
    blockedUrl,
    hasBrowserExtension,
    isWaitingForBrowser,
    foundTab,
    notReadableUrl,
    emptyContentUrl: hasMinimalContent ? article?.url || emptyContentUrl : emptyContentUrl,
    hasBrowserExtensionAvailable,
    handleFetchFromBrowser,
    handleRetryWithoutCheck,
    handleTryPaywallHopper,
    handleUrlSubmit,
  };
}
