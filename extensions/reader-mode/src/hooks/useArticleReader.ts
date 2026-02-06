/**
 * useArticleReader - React hook for article reading UI state management
 *
 * This hook manages all React state and user interactions for the Reader commands.
 * It is the "orchestrator" that coordinates UI state, user actions, and AI summarization.
 *
 * Responsibilities:
 * - React state management (loading, errors, article, summary, blocked pages, etc.)
 * - User action handlers (summarize, retry, reimport from browser, etc.)
 * - AI summarization via Raycast's useAI hook
 * - Coordinating with article-loader.ts for fetching/parsing
 *
 * Relationship to article-loader.ts:
 * - article-loader.ts is a pure async utility (stateless, no React)
 * - This hook calls loadArticleFromUrl/loadArticleViaPaywallHopper and manages the results
 * - article-loader handles "how" to fetch/parse; this hook handles "when" and state updates
 *
 * @see src/utils/article-loader.ts for the fetch/parse/paywall logic
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { environment, AI, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { ArticleState } from "../types/article";
import { BrowserTab } from "../types/browser";
import { SummaryStyle } from "../types/summary";
import { getAIConfigForStyle } from "../config/ai";
import { rewriteArticleTitle } from "../config/prompts";
import { getArchiveSourceLabel } from "../config/labels";
import { getCachedSummary, setCachedSummary, getLastSummaryStyle } from "../utils/summaryCache";
import {
  isBrowserExtensionAvailable,
  reimportFromBrowserTab,
  getContentFromActiveTab,
} from "../utils/browser-extension";
import { urlLog } from "../utils/logger";
import { isValidUrl } from "../utils/url-resolver";
import { getStyleLabel, buildSummaryPrompt, logSummarySuccess, logSummaryError } from "../utils/summarizer";
import { loadArticleFromUrl, loadArticleViaPaywallHopper, LoadArticleResult } from "../utils/article-loader";

const MINIMUM_ARTICLE_LENGTH = 100;

export interface UseArticleReaderOptions {
  resolveUrl: () => Promise<{ url: string; source: string } | null>;
  onNoUrl?: () => void;
  commandName: string;
}

export interface ArticleReaderState {
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
  reimportInactiveTab: { url: string; tab: { id: number; title?: string } } | null;
  summaryStyle: SummaryStyle | null;
  currentSummary: string | null;
  isSummarizing: boolean;
  shouldShowSummary: boolean;
  canAccessAI: boolean;
}

export interface ArticleReaderActions {
  handleSummarize: (style: SummaryStyle) => Promise<void>;
  handleStopSummarizing: () => Promise<void>;
  handleReimportFromBrowser: () => Promise<void>;
  handleRetryReimport: () => Promise<void>;
  handleFetchFromBrowser: () => Promise<void>;
  handleRetryWithoutCheck: () => Promise<void>;
  handleTryPaywallHopper: () => Promise<void>;
  handleUrlSubmit: (url: string) => Promise<void>;
  clearReimportInactiveTab: () => void;
}

export function useArticleReader(options: UseArticleReaderOptions): ArticleReaderState & ArticleReaderActions {
  const { resolveUrl, onNoUrl, commandName } = options;
  const preferences = getPreferenceValues<Preferences.Open>();
  const canAccessAI = environment.canAccess(AI);
  const shouldShowSummary = canAccessAI && preferences.enableAISummary;

  // Article state
  const [article, setArticle] = useState<ArticleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Blocked page state
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [hasBrowserExtension, setHasBrowserExtension] = useState(false);
  const [isWaitingForBrowser, setIsWaitingForBrowser] = useState(false);
  const [foundTab, setFoundTab] = useState<BrowserTab | null>(null);

  // Not-readable page state
  const [notReadableUrl, setNotReadableUrl] = useState<string | null>(null);

  // Empty content page state
  const [emptyContentUrl, setEmptyContentUrl] = useState<string | null>(null);

  // Browser extension state
  const [hasBrowserExtensionAvailable, setHasBrowserExtensionAvailable] = useState(false);
  const [reimportInactiveTab, setReimportInactiveTab] = useState<{
    url: string;
    tab: { id: number; title?: string };
  } | null>(null);

  // Summary state
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle | null>(null);
  const [summaryPrompt, setSummaryPrompt] = useState<string>("");
  const [cachedSummary, setCachedSummaryState] = useState<string | null>(null);
  const [summaryInitialized, setSummaryInitialized] = useState(false);
  const [summaryStartTime, setSummaryStartTime] = useState<number | null>(null);
  const [completedSummary, setCompletedSummary] = useState<string | null>(null);

  // Refs
  const fetchStartedRef = useRef(false);
  const toastRef = useRef<Toast | null>(null);

  // Get AI config based on current summary style
  const aiConfig = getAIConfigForStyle(summaryStyle);

  // useAI hook for summarization
  const { data: summaryData, isLoading: isSummarizing } = useAI(summaryPrompt, {
    creativity: aiConfig.creativity,
    model: aiConfig.model,
    execute: !!summaryPrompt && !!summaryStyle && !cachedSummary,
    onWillExecute: async () => {
      setSummaryStartTime(Date.now());
      setCompletedSummary(null);

      toastRef.current = await showToast({
        style: Toast.Style.Animated,
        title: "Generating summary...",
      });
    },
    onError: async (err) => {
      if (summaryStyle) {
        const durationMs = summaryStartTime ? Date.now() - summaryStartTime : undefined;
        logSummaryError(summaryStyle, err.message, durationMs);

        let userMessage = err.message;
        const httpStatusMatch = err.message.match(/HTTP Status:\s*(\d+)/);
        if (httpStatusMatch) {
          const statusCode = httpStatusMatch[1];
          userMessage =
            statusCode === "503"
              ? "AI service temporarily unavailable. Please try again."
              : `AI service error (HTTP ${statusCode}). Please try again.`;
        } else if (err.message.includes("<!DOCTYPE") || err.message.includes("<html")) {
          userMessage = "AI service error. Please try again.";
        }

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to generate summary",
          message: userMessage,
        });
      }
    },
  });

  // When streaming completes, log final stats and cache the complete summary
  useEffect(() => {
    if (summaryData && summaryStyle && article && !isSummarizing && !completedSummary && !cachedSummary) {
      const durationMs = summaryStartTime ? Date.now() - summaryStartTime : undefined;
      const estimatedTokens = Math.ceil(summaryData.length / 4);
      logSummarySuccess(summaryStyle, summaryData.length, durationMs, estimatedTokens);

      setCachedSummary(article.url, summaryStyle, summaryData, preferences.summaryOutputLanguage);
      setCompletedSummary(summaryData);

      if (toastRef.current) {
        toastRef.current.style = Toast.Style.Success;
        toastRef.current.title = "Summary generated";
        toastRef.current.message = `${getStyleLabel(summaryStyle)} (${(durationMs! / 1000).toFixed(1)}s)`;
      }
    }
  }, [
    summaryData,
    summaryStyle,
    article,
    isSummarizing,
    completedSummary,
    cachedSummary,
    summaryStartTime,
    preferences.summaryOutputLanguage,
  ]);

  // Handle summarization with cache check
  const handleSummarize = useCallback(
    async (style: SummaryStyle) => {
      if (!article) return;

      setSummaryStyle(style);
      setCachedSummaryState(null);

      const cached = await getCachedSummary(article.url, style, preferences.summaryOutputLanguage);
      if (cached) {
        setCachedSummaryState(cached);
        return;
      }

      const translationOptions = { language: preferences.summaryOutputLanguage };
      const prompt = buildSummaryPrompt(article.title, article.textContent, style, translationOptions);
      setSummaryPrompt(prompt);
    },
    [article, preferences.summaryOutputLanguage],
  );

  // Handle stopping summarization
  const handleStopSummarizing = useCallback(async () => {
    setSummaryPrompt("");

    if (!article) {
      setSummaryStyle(null);
      return;
    }

    const lastStyle = await getLastSummaryStyle(article.url);

    if (lastStyle) {
      const cached = await getCachedSummary(article.url, lastStyle, preferences.summaryOutputLanguage);

      if (cached) {
        setSummaryStyle(lastStyle);
        setCachedSummaryState(cached);
      } else {
        setSummaryStyle(null);
        setCachedSummaryState(null);
      }
    } else {
      setSummaryStyle(null);
      setCachedSummaryState(null);
    }

    if (toastRef.current) {
      toastRef.current.hide();
      toastRef.current = null;
    }
  }, [article, preferences.summaryOutputLanguage]);

  // Process article loading result
  const handleLoadResult = useCallback(
    async (result: LoadArticleResult) => {
      if (result.status === "success") {
        const articleToSet = result.article;

        if (preferences.rewriteArticleTitles && canAccessAI) {
          const rewrittenTitle = await rewriteArticleTitle(articleToSet.title, articleToSet.url);
          articleToSet.title = rewrittenTitle;
        }

        setArticle(articleToSet);
        setBlockedUrl(null);
        setNotReadableUrl(null);
        setEmptyContentUrl(null);
        setError(null);

        if (articleToSet.archiveSource) {
          await showToast({
            style: Toast.Style.Success,
            title: "Paywall bypassed",
            message: `Retrieved via ${getArchiveSourceLabel(articleToSet.archiveSource.service)}`,
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
    },
    [preferences.rewriteArticleTitles, canAccessAI],
  );

  // Initial article load
  useEffect(() => {
    if (fetchStartedRef.current) return;
    fetchStartedRef.current = true;

    async function loadArticle() {
      urlLog.log("session:start", { command: commandName });

      const urlResult = await resolveUrl();
      if (!urlResult) {
        urlLog.error("session:error", { reason: "no valid URL found" });
        if (onNoUrl) {
          onNoUrl();
        } else {
          setError("No valid URL found. Please make sure you have a valid URL available.");
        }
        setIsLoading(false);
        return;
      }

      const result = await loadArticleFromUrl(urlResult.url, urlResult.source, {
        skipPreCheck: preferences.skipPreCheck,
        enablePaywallHopper: preferences.enablePaywallHopper,
        showArticleImage: preferences.showArticleImage,
      });
      handleLoadResult(result);
    }

    loadArticle();
  }, [
    resolveUrl,
    onNoUrl,
    commandName,
    preferences.skipPreCheck,
    preferences.enablePaywallHopper,
    preferences.showArticleImage,
    handleLoadResult,
  ]);

  // Auto-trigger summary generation when article loads
  useEffect(() => {
    if (article && shouldShowSummary && !summaryInitialized && !article.bypassedReadabilityCheck) {
      setSummaryInitialized(true);
      handleSummarize(preferences.defaultSummaryStyle);
      urlLog.log("summary:auto-triggered", { url: article.url });
    } else if (article && article.bypassedReadabilityCheck) {
      urlLog.log("summary:skipped-bypassed-check", { url: article.url });
    }
  }, [article, shouldShowSummary, summaryInitialized, handleSummarize, preferences.defaultSummaryStyle]);

  // Check browser extension availability on mount
  useEffect(() => {
    isBrowserExtensionAvailable().then(setHasBrowserExtensionAvailable);
  }, []);

  // Handler to fetch content via browser extension after user opens the page
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

  // Handler to reimport content from browser tab
  const handleReimportFromBrowser = useCallback(async () => {
    if (!article) return;

    setIsLoading(true);
    setError(null);
    setReimportInactiveTab(null);

    const result = await reimportFromBrowserTab(article.url);

    if (result.status === "success") {
      setArticle({ ...result.article, title: article.title });
      setSummaryInitialized(false);
      urlLog.log("reimport:complete", { url: article.url });
    } else if (result.status === "tab_inactive") {
      setReimportInactiveTab({ url: article.url, tab: result.tab });
      urlLog.log("reimport:tab-inactive", { url: article.url, tabId: result.tab.id });
    } else if (result.status === "no_matching_tab") {
      setError("No browser tab found with this URL. Please open the article in your browser first.");
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [article]);

  // Handler to retry reimport after user focuses the tab
  const handleRetryReimport = useCallback(async () => {
    if (!reimportInactiveTab) return;

    setIsLoading(true);
    setError(null);

    const result = await reimportFromBrowserTab(reimportInactiveTab.url);

    if (result.status === "success") {
      const existingTitle = article?.title || result.article.title;
      setArticle({ ...result.article, title: existingTitle });
      setReimportInactiveTab(null);
      setSummaryInitialized(false);
      urlLog.log("reimport:retry-success", { url: reimportInactiveTab.url });
    } else if (result.status === "tab_inactive") {
      setReimportInactiveTab({ url: reimportInactiveTab.url, tab: result.tab });
      setError("Tab is still not focused. Please click on the tab in your browser to activate it.");
    } else if (result.status === "no_matching_tab") {
      setReimportInactiveTab(null);
      setError("Tab no longer found. Please open the article in your browser.");
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [reimportInactiveTab, article]);

  // Handler to retry loading without readability check
  const handleRetryWithoutCheck = useCallback(async () => {
    if (!notReadableUrl) return;

    setIsLoading(true);
    setNotReadableUrl(null);
    setError(null);

    urlLog.log("session:retry-without-check", { url: notReadableUrl });

    const result = await loadArticleFromUrl(notReadableUrl, "retry", {
      skipPreCheck: true,
      enablePaywallHopper: preferences.enablePaywallHopper,
      showArticleImage: preferences.showArticleImage,
    });
    handleLoadResult(result);
  }, [notReadableUrl, handleLoadResult, preferences.enablePaywallHopper, preferences.showArticleImage]);

  // Handler to try Paywall Hopper directly
  const handleTryPaywallHopper = useCallback(async () => {
    if (!notReadableUrl) return;

    setIsLoading(true);
    setNotReadableUrl(null);
    setError(null);

    urlLog.log("session:try-paywall-hopper", { url: notReadableUrl });

    const result = await loadArticleViaPaywallHopper(notReadableUrl, {
      showArticleImage: preferences.showArticleImage,
    });

    if (result.status === "success") {
      handleLoadResult(result);
    } else {
      setError(result.error);
      setNotReadableUrl(notReadableUrl);
      setIsLoading(false);
    }
  }, [notReadableUrl, handleLoadResult, preferences.showArticleImage]);

  // Handler for URL form submission
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
        showArticleImage: preferences.showArticleImage,
      });
      handleLoadResult(result);
    },
    [preferences.skipPreCheck, preferences.enablePaywallHopper, preferences.showArticleImage, handleLoadResult],
  );

  // Check for minimal content
  const hasMinimalContent = article && article.bodyMarkdown.trim().length < MINIMUM_ARTICLE_LENGTH;
  if (hasMinimalContent && !emptyContentUrl) {
    urlLog.warn("article:empty-content", {
      url: article.url,
      markdownLength: article.bodyMarkdown.length,
      bypassedCheck: article.bypassedReadabilityCheck,
    });
  }

  const currentSummary = cachedSummary || summaryData;

  return {
    // State
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
    reimportInactiveTab,
    summaryStyle,
    currentSummary: currentSummary || null,
    isSummarizing,
    shouldShowSummary,
    canAccessAI,
    // Actions
    handleSummarize,
    handleStopSummarizing,
    handleReimportFromBrowser,
    handleRetryReimport,
    handleFetchFromBrowser,
    handleRetryWithoutCheck,
    handleTryPaywallHopper,
    handleUrlSubmit,
    clearReimportInactiveTab: () => setReimportInactiveTab(null),
  };
}
