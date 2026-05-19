import { Detail } from "@raycast/api";
import { RSVPArticleState, RSVPArticleActions } from "../hooks/useRSVPArticle";
import { UrlInputForm } from "./UrlInputForm";
import { BlockedPageView } from "./BlockedPageView";
import { NotReadableView } from "./NotReadableView";
import { EmptyContentView } from "./EmptyContentView";
import { RSVPView } from "./RSVPView";

export interface RSVPReaderViewProps extends RSVPArticleState, RSVPArticleActions {
  showUrlForm?: boolean;
  invalidInput?: string | null;
  onUrlFormSubmit?: (url: string) => void;
  onHideUrlForm?: () => void;
}

export function RSVPReaderView(props: RSVPReaderViewProps) {
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
    showUrlForm,
    invalidInput,
    handleFetchFromBrowser,
    handleRetryWithoutCheck,
    handleTryPaywallHopper,
    handleUrlSubmit,
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
          if (onUrlFormSubmit) onUrlFormSubmit(url);
          else handleUrlSubmit(url);
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

  if (error || !article) {
    return <Detail markdown={`# Error\n\n${error || "Unable to load article"}`} />;
  }

  return <RSVPView article={article} />;
}
