import { Detail } from "@raycast/api";
import { ArticleReaderState, ArticleReaderActions } from "../hooks/useArticleReader";
import { UrlInputForm } from "./UrlInputForm";
import { BlockedPageView } from "./BlockedPageView";
import { NotReadableView } from "./NotReadableView";
import { EmptyContentView } from "./EmptyContentView";
import { ArticleDetailView } from "./ArticleDetailView";
import { InactiveTabActions } from "../actions/InactiveTabActions";

export interface ArticleReaderViewProps extends ArticleReaderState, ArticleReaderActions {
  showUrlForm?: boolean;
  invalidInput?: string | null;
  onUrlFormSubmit?: (url: string) => void;
  onHideUrlForm?: () => void;
}

export function ArticleReaderView(props: ArticleReaderViewProps) {
  const {
    article,
    isLoading,
    error,
    blockedUrl,
    hasBrowserExtension,
    isWaitingForBrowser,
    foundTab,
    notReadableUrl,
    emptyContentUrl,
    reimportInactiveTab,
    summaryStyle,
    currentSummary,
    isSummarizing,
    canAccessAI,
    hasBrowserExtensionAvailable,
    showUrlForm,
    invalidInput,
    handleSummarize,
    handleStopSummarizing,
    handleReimportFromBrowser,
    handleRetryReimport,
    handleFetchFromBrowser,
    handleRetryWithoutCheck,
    handleTryPaywallHopper,
    handleUrlSubmit,
    clearReimportInactiveTab,
    onUrlFormSubmit,
    onHideUrlForm,
  } = props;

  if (isLoading) {
    return <Detail isLoading={true} markdown="" />;
  }

  if (showUrlForm) {
    return (
      <UrlInputForm
        initialUrl={invalidInput || undefined}
        invalidInput={invalidInput || undefined}
        onSubmit={(url) => {
          onHideUrlForm?.();
          if (onUrlFormSubmit) {
            onUrlFormSubmit(url);
          } else {
            handleUrlSubmit(url);
          }
        }}
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
            onCancel={clearReimportInactiveTab}
          />
        }
      />
    );
  }

  if (error || !article) {
    return <Detail markdown={`# Error\n\n${error || "Unable to load article"}`} />;
  }

  return (
    <ArticleDetailView
      article={article}
      summaryStyle={summaryStyle}
      currentSummary={currentSummary}
      isSummarizing={isSummarizing}
      canAccessAI={canAccessAI}
      onSummarize={handleSummarize}
      onStopSummarizing={isSummarizing ? handleStopSummarizing : undefined}
      onReimportFromBrowser={hasBrowserExtensionAvailable ? handleReimportFromBrowser : undefined}
    />
  );
}
