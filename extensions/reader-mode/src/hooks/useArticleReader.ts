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
import { environment, AI, Clipboard, Keyboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { ArticleState } from "../types/article";
import { BrowserTab } from "../types/browser";
import { SummaryStyle } from "../types/summary";
import {
  getAIConfigForStyle,
  getSummaryModelChoice,
  getSummaryModelTitle,
  DEFAULT_SUMMARY_MODEL,
  SummaryModelKey,
} from "../config/ai";
import { rewriteArticleTitle } from "../config/prompts";
import { getArchiveSourceLabel } from "../config/labels";
import { getCachedSummary, setCachedSummary, getLastSummaryStyle } from "../utils/summaryCache";
import {
  isBrowserExtensionAvailable,
  reimportFromBrowserTab,
  getContentFromActiveTab,
} from "../utils/browser-extension";
import { urlLog, aiLog } from "../utils/logger";
import { isValidUrl } from "../utils/url-resolver";
import {
  getStyleLabel,
  buildSummaryPrompt,
  logSummarySuccess,
  logSummaryError,
  regenerateNeedsRevalidate,
} from "../utils/summarizer";
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
  /** What the loader is currently doing, shown while `isLoading`. */
  loadingStatus: string | null;
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
  /** The model the current summary comes from. */
  summaryModel: SummaryModelKey;
  currentSummary: string | null;
  isSummarizing: boolean;
  shouldShowSummary: boolean;
  canAccessAI: boolean;
}

export interface ArticleReaderActions {
  handleSummarize: (style: SummaryStyle) => Promise<void>;
  handleRegenerate: (model: SummaryModelKey) => void;
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
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
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

  // Browser extension availability is answered locally by `environment.canAccess` —
  // no IPC, no async, so it needs neither state nor an effect.
  const hasBrowserExtensionAvailable = isBrowserExtensionAvailable();

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
  // A model picked with "Regenerate with Model…" applies for the rest of this session.
  const [modelOverride, setModelOverride] = useState<SummaryModelKey | undefined>(undefined);
  // Read once, so the model named on a summary can't change under it if the preference does.
  const [preferredModel] = useState(getSummaryModelChoice);

  // Refs
  const fetchStartedRef = useRef(false);
  const toastRef = useRef<Toast | null>(null);
  // Set only when the latest run finished: a failed or stopped run must not overwrite the cache.
  const runSucceededRef = useRef(false);
  // Bumped by every summary request, so a cache read that resolves late can't replace a newer one.
  const summaryRequestRef = useRef(0);
  // The summary a regenerate is replacing, so Stop can put it back exactly as it was shown.
  const regenerateFromRef = useRef<{
    model: SummaryModelKey | undefined;
    style: SummaryStyle;
    summary: string;
  } | null>(null);

  // Undefined means the default model, which keeps the cache keys summaries had before models were selectable.
  const cacheModel = modelOverride ?? preferredModel;
  const aiConfig = getAIConfigForStyle(summaryStyle, cacheModel ?? DEFAULT_SUMMARY_MODEL);

  // useAI hook for summarization
  const {
    data: summaryData,
    isLoading: isSummarizing,
    revalidate: revalidateSummary,
  } = useAI(summaryPrompt, {
    creativity: aiConfig.creativity,
    model: aiConfig.model,
    execute: !!summaryPrompt && !!summaryStyle && !cachedSummary,
    onWillExecute: async () => {
      runSucceededRef.current = false;
      setSummaryStartTime(performance.now());
      setCompletedSummary(null);

      const request = summaryRequestRef.current;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Generating summary...",
      });
      // Stopped or superseded while the toast was opening: nothing will hide it later.
      if (request !== summaryRequestRef.current) {
        toast.hide();
        return;
      }
      toastRef.current = toast;
    },
    onData: () => {
      runSucceededRef.current = true;
    },
    onError: async (err) => {
      if (summaryStyle) {
        const durationMs = summaryStartTime ? Math.round(performance.now() - summaryStartTime) : undefined;
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
          primaryAction: {
            title: "Copy Error",
            shortcut: Keyboard.Shortcut.Common.Copy,
            onAction: async () => {
              // Copy the raw error, not the friendlier rewrite above — this is for bug reports.
              await Clipboard.copy(err.message);
            },
          },
        });
      }
    },
  });

  // When streaming completes, log final stats and cache the complete summary
  useEffect(() => {
    if (
      runSucceededRef.current &&
      summaryData &&
      summaryStyle &&
      article &&
      !isSummarizing &&
      !completedSummary &&
      !cachedSummary
    ) {
      runSucceededRef.current = false;
      regenerateFromRef.current = null;
      const durationMs = summaryStartTime ? Math.round(performance.now() - summaryStartTime) : undefined;
      const estimatedTokens = Math.ceil(summaryData.length / 4);
      logSummarySuccess(summaryStyle, summaryData.length, durationMs, estimatedTokens);

      setCachedSummary(article.url, summaryStyle, summaryData, preferences.summaryOutputLanguage, cacheModel);
      setCompletedSummary(summaryData);

      if (toastRef.current) {
        toastRef.current.style = Toast.Style.Success;
        toastRef.current.title = "Summary generated";
        const modelLabel =
          cacheModel && cacheModel !== DEFAULT_SUMMARY_MODEL ? ` · ${getSummaryModelTitle(cacheModel)}` : "";
        toastRef.current.message = `${getStyleLabel(summaryStyle)}${modelLabel} (${(durationMs! / 1000).toFixed(1)}s)`;
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
    cacheModel,
  ]);

  // Handle summarization with cache check
  const handleSummarize = useCallback(
    async (style: SummaryStyle) => {
      if (!article) return;

      const request = ++summaryRequestRef.current;
      regenerateFromRef.current = null;
      setSummaryStyle(style);
      setCachedSummaryState(null);

      const cached = await getCachedSummary(article.url, style, preferences.summaryOutputLanguage, cacheModel);
      if (request !== summaryRequestRef.current) return;
      if (cached) {
        setCachedSummaryState(cached);
        return;
      }

      const translationOptions = { language: preferences.summaryOutputLanguage };
      const prompt = buildSummaryPrompt(article.title, article.textContent, style, translationOptions);
      setSummaryPrompt(prompt);
    },
    [article, preferences.summaryOutputLanguage, cacheModel],
  );

  // Regenerate the current style's summary, skipping the cache, with the same model
  // ("Regenerate") or another one ("Regenerate with Model…").
  const handleRegenerate = useCallback(
    (model: SummaryModelKey) => {
      if (!article || !summaryStyle) return;

      const translationOptions = { language: preferences.summaryOutputLanguage };
      const prompt = buildSummaryPrompt(article.title, article.textContent, summaryStyle, translationOptions);
      const currentModel = cacheModel ?? DEFAULT_SUMMARY_MODEL;
      const force = regenerateNeedsRevalidate({
        prompt,
        currentPrompt: summaryPrompt,
        fromCache: !!cachedSummary,
        model,
        currentModel,
      });

      aiLog.log("summary:regenerate", { style: summaryStyle, from: currentModel, to: model, force });
      summaryRequestRef.current++;
      regenerateFromRef.current ??= {
        model: modelOverride,
        style: summaryStyle,
        summary: cachedSummary || summaryData,
      };
      setModelOverride(model);
      setCachedSummaryState(null);
      setSummaryPrompt(prompt);
      if (force) revalidateSummary();
    },
    [
      article,
      summaryStyle,
      summaryPrompt,
      cachedSummary,
      summaryData,
      cacheModel,
      modelOverride,
      preferences.summaryOutputLanguage,
      revalidateSummary,
    ],
  );

  // Handle stopping summarization
  const handleStopSummarizing = useCallback(async () => {
    setSummaryPrompt("");
    // A result that succeeded before this render must not be cached under the restored model.
    runSucceededRef.current = false;
    const request = ++summaryRequestRef.current;

    if (toastRef.current) {
      toastRef.current.hide();
      toastRef.current = null;
    }

    // A stopped regenerate puts back the summary it was replacing, in the same render.
    const previous = regenerateFromRef.current;
    regenerateFromRef.current = null;
    if (previous) {
      setModelOverride(previous.model);
      setSummaryStyle(previous.style);
      setCachedSummaryState(previous.summary || null);
      return;
    }

    if (!article) {
      setSummaryStyle(null);
      return;
    }

    const lastStyle = await getLastSummaryStyle(article.url);
    if (request !== summaryRequestRef.current) return;

    if (lastStyle) {
      const cached = await getCachedSummary(article.url, lastStyle, preferences.summaryOutputLanguage, cacheModel);
      if (request !== summaryRequestRef.current) return;

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
  }, [article, preferences.summaryOutputLanguage, cacheModel]);

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
      setLoadingStatus(null);
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
        onProgress: setLoadingStatus,
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
      onProgress: setLoadingStatus,
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
      onProgress: setLoadingStatus,
    });

    if (result.status === "success") {
      handleLoadResult(result);
    } else {
      setError(result.error);
      setNotReadableUrl(notReadableUrl);
      setIsLoading(false);
      setLoadingStatus(null);
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
        onProgress: setLoadingStatus,
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
    loadingStatus,
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
    summaryModel: cacheModel ?? DEFAULT_SUMMARY_MODEL,
    currentSummary: currentSummary || null,
    isSummarizing,
    shouldShowSummary,
    canAccessAI,
    // Actions
    handleSummarize,
    handleRegenerate,
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
