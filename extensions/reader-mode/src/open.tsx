import { useState, useEffect, useCallback, useRef } from "react";
import { Detail, LaunchProps, environment, AI, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { urlLog } from "./utils/logger";
import {
  getContentFromActiveTab,
  isBrowserExtensionAvailable,
  reimportFromBrowserTab,
} from "./utils/browser-extension";
import { BrowserTab } from "./types/browser";
import { SummaryStyle } from "./types/summary";
import { getStyleLabel, buildSummaryPrompt, logSummarySuccess, logSummaryError } from "./utils/summarizer";
import { rewriteArticleTitle } from "./config/prompts";
import { getCachedSummary, setCachedSummary, getLastSummaryStyle } from "./utils/summaryCache";
import { getAIConfigForStyle } from "./config/ai";
import { resolveUrl, isValidUrl } from "./utils/url-resolver";
import { loadArticleFromUrl, loadArticleViaPaywallHopper } from "./utils/article-loader";
import { ArticleState } from "./types/article";
import { UrlInputForm } from "./views/UrlInputForm";
import { BlockedPageView } from "./views/BlockedPageView";
import { NotReadableView } from "./views/NotReadableView";
import { EmptyContentView } from "./views/EmptyContentView";
import { ArticleDetailView } from "./views/ArticleDetailView";
import { InactiveTabActions } from "./actions/InactiveTabActions";

const MINIMUM_ARTICLE_LENGTH = 100;

export default function Command(props: LaunchProps<{ arguments: Arguments.Open }>) {
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

  // URL form state
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [invalidInput, setInvalidInput] = useState<string | null>(null);

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

  // useAI hook for summarization - only executes when summaryPrompt is set
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

        // Sanitize error message - extract HTTP status if present, otherwise show generic message
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

      const language = summaryStyle === "translated" ? preferences.translationLanguage : undefined;
      setCachedSummary(article.url, summaryStyle, summaryData, language);
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
    preferences.translationLanguage,
  ]);

  // Handle summarization with cache check
  const handleSummarize = useCallback(
    async (style: SummaryStyle) => {
      if (!article) return;

      setSummaryStyle(style);
      setCachedSummaryState(null);

      const language = style === "translated" ? preferences.translationLanguage : undefined;
      const cached = await getCachedSummary(article.url, style, language);
      if (cached) {
        setCachedSummaryState(cached);
        return;
      }

      const translationOptions = language ? { language } : undefined;
      const prompt = buildSummaryPrompt(article.title, article.textContent, style, translationOptions);
      setSummaryPrompt(prompt);
    },
    [article, preferences.translationLanguage],
  );

  // Handle stopping summarization - reverts to last cached summary or hides block
  const handleStopSummarizing = useCallback(async () => {
    // Clear prompt to stop useAI execution
    setSummaryPrompt("");

    if (!article) {
      setSummaryStyle(null);
      return;
    }

    // Get the last successfully used style from cache
    const lastStyle = await getLastSummaryStyle(article.url);

    if (lastStyle) {
      // Revert to the last cached summary
      const language = lastStyle === "translated" ? preferences.translationLanguage : undefined;
      const cached = await getCachedSummary(article.url, lastStyle, language);

      if (cached) {
        setSummaryStyle(lastStyle);
        setCachedSummaryState(cached);
      } else {
        // No cached summary found - hide summary block
        setSummaryStyle(null);
        setCachedSummaryState(null);
      }
    } else {
      // No previous style - hide summary block
      setSummaryStyle(null);
      setCachedSummaryState(null);
    }

    // Hide toast
    if (toastRef.current) {
      toastRef.current.hide();
      toastRef.current = null;
    }
  }, [article, preferences.translationLanguage]);

  // Process article loading result
  const handleLoadResult = useCallback(
    async (result: Awaited<ReturnType<typeof loadArticleFromUrl>>) => {
      if (result.status === "success") {
        const articleToSet = result.article;

        // Rewrite title if preference enabled and AI available
        if (preferences.rewriteArticleTitles && canAccessAI) {
          const rewrittenTitle = await rewriteArticleTitle(articleToSet.title, articleToSet.url);
          articleToSet.title = rewrittenTitle;
        }

        setArticle(articleToSet);
        setBlockedUrl(null);
        setNotReadableUrl(null);
        setEmptyContentUrl(null);
        setError(null);

        // Show toast when article was retrieved via Paywall Hopper
        if (articleToSet.archiveSource) {
          const sourceLabels: Record<string, string> = {
            googlebot: "Googlebot bypass",
            bingbot: "Bingbot bypass",
            "social-referrer": "Social media referrer",
            wallhopper: "WallHopper",
            "archive.is": "archive.is",
            wayback: "Wayback Machine",
            browser: "browser tab",
          };
          const label = sourceLabels[articleToSet.archiveSource.service] || articleToSet.archiveSource.service;
          await showToast({
            style: Toast.Style.Success,
            title: "Paywall bypassed",
            message: `Retrieved via ${label}`,
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
      urlLog.log("session:start", { argumentUrl: props.arguments.url });

      const urlResult = await resolveUrl(props.arguments.url);
      if (!urlResult) {
        urlLog.error("session:error", { reason: "no valid URL found" });
        if (props.arguments.url && props.arguments.url.trim()) {
          setInvalidInput(props.arguments.url.trim());
        }
        setShowUrlForm(true);
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
    props.arguments.url,
    preferences.skipPreCheck,
    preferences.enablePaywallHopper,
    preferences.showArticleImage,
    handleLoadResult,
  ]);

  // Auto-trigger summary generation when article loads (if enabled)
  // Don't generate summary for articles that bypassed readability check
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

  // Check browser extension availability on mount
  useEffect(() => {
    isBrowserExtensionAvailable().then(setHasBrowserExtensionAvailable);
  }, []);

  // Handler to reimport content from browser tab
  const handleReimportFromBrowser = useCallback(async () => {
    if (!article) return;

    setIsLoading(true);
    setError(null);
    setReimportInactiveTab(null);

    const result = await reimportFromBrowserTab(article.url);

    if (result.status === "success") {
      // Preserve the existing title (which may be AI-rewritten) when reimporting
      setArticle({ ...result.article, title: article.title });
      setSummaryInitialized(false); // Reset to allow new summary generation
      urlLog.log("reimport:complete", { url: article.url });
    } else if (result.status === "tab_inactive") {
      // Tab found but not active - prompt user to focus it
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
      // Preserve the existing title (which may be AI-rewritten) when reimporting
      const existingTitle = article?.title || result.article.title;
      setArticle({ ...result.article, title: existingTitle });
      setReimportInactiveTab(null);
      setSummaryInitialized(false);
      urlLog.log("reimport:retry-success", { url: reimportInactiveTab.url });
    } else if (result.status === "tab_inactive") {
      // Still inactive - update tab info and show error in the prompt
      setReimportInactiveTab({ url: reimportInactiveTab.url, tab: result.tab });
      setError("Tab is still not focused. Please click on the tab in your browser to activate it.");
    } else if (result.status === "no_matching_tab") {
      setReimportInactiveTab(null);
      setError("Tab no longer found. Please open the article in your browser.");
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [reimportInactiveTab]);

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

  // Handler to try Paywall Hopper directly for known paywalled sites
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
      // If hopper failed, show error but allow retry
      setError(result.error);
      setNotReadableUrl(notReadableUrl);
      setIsLoading(false);
    }
  }, [notReadableUrl, handleLoadResult, preferences.showArticleImage]);

  // Handler for URL form submission
  const handleUrlSubmit = useCallback(
    async (url: string) => {
      setShowUrlForm(false);
      setInvalidInput(null);
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

  // --- Render Logic ---

  if (isLoading) {
    return <Detail isLoading={true} markdown="" />;
  }

  if (showUrlForm) {
    return (
      <UrlInputForm
        initialUrl={invalidInput || undefined}
        invalidInput={invalidInput || undefined}
        onSubmit={handleUrlSubmit}
      />
    );
  }

  if (notReadableUrl && error) {
    return (
      <NotReadableView
        url={notReadableUrl}
        error={error}
        onRetryWithoutCheck={handleRetryWithoutCheck}
        onTryPaywallHopper={handleTryPaywallHopper}
      />
    );
  }

  if (emptyContentUrl) {
    return <EmptyContentView url={emptyContentUrl} />;
  }

  if (blockedUrl && error) {
    return (
      <BlockedPageView
        blockedUrl={blockedUrl}
        hasBrowserExtension={hasBrowserExtension}
        isWaitingForBrowser={isWaitingForBrowser}
        foundTab={foundTab}
        onFetchFromBrowser={handleFetchFromBrowser}
      />
    );
  }

  // Show inactive tab prompt when reimport found a tab but it's not focused
  // This must come BEFORE the generic error check so retry failures don't dead-end
  if (reimportInactiveTab) {
    const tabTitle = reimportInactiveTab.tab.title || "the article";
    const errorMessage = error ? `\n\n**Note:** ${error}` : "";
    const instructions = `# Focus Browser Tab\n\nThe article is open in a browser tab, but the tab is not currently focused.\n\nPlease click on the tab titled **"${tabTitle}"** in your browser to activate it, then try again.\n\n**Tip:** If you have multiple browser windows, make sure the window containing the tab is also in the foreground.${errorMessage}`;

    return (
      <Detail
        markdown={instructions}
        actions={
          <InactiveTabActions
            url={reimportInactiveTab.url}
            onRetry={handleRetryReimport}
            onCancel={() => setReimportInactiveTab(null)}
          />
        }
      />
    );
  }

  if (error || !article) {
    return <Detail markdown={`# Error\n\n${error || "Unable to load article"}`} />;
  }

  // Check if article has minimal or no content
  const hasMinimalContent = article.bodyMarkdown.trim().length < MINIMUM_ARTICLE_LENGTH;
  if (hasMinimalContent) {
    urlLog.warn("article:empty-content", {
      url: article.url,
      markdownLength: article.bodyMarkdown.length,
      bypassedCheck: article.bypassedReadabilityCheck,
    });
    return <EmptyContentView url={article.url} />;
  }

  const currentSummary = cachedSummary || summaryData;

  return (
    <ArticleDetailView
      article={article}
      summaryStyle={summaryStyle}
      currentSummary={currentSummary || null}
      isSummarizing={isSummarizing}
      shouldShowSummary={shouldShowSummary}
      canAccessAI={canAccessAI}
      onSummarize={handleSummarize}
      onStopSummarizing={isSummarizing ? handleStopSummarizing : undefined}
      onReimportFromBrowser={hasBrowserExtensionAvailable ? handleReimportFromBrowser : undefined}
    />
  );
}
