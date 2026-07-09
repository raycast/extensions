import { formatDateTime, formatElapsedTime } from "../../../utils";
import { PreviewDetail } from "../../../preview/PreviewDetail";
import { Notification } from "../../../notification";
import { Detail } from "@raycast/api";
import { WebPage } from "../types";

interface APINotificationPreviewProps {
  notification: Notification;
  webPage: WebPage;
}

function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function APINotificationPreview({ notification, webPage }: APINotificationPreviewProps) {
  const sourceLabel = webPage.source === "universalinboxextension" ? "Universal Inbox extension" : webPage.source;
  const markdown = `# ${webPage.title || notification.title}\n\n[${webPage.url}](${webPage.url})`;

  const metadata = (
    <>
      <Detail.Metadata.Link title="Host" target={webPage.url} text={getHost(webPage.url)} />
      <Detail.Metadata.Label title="Source" text={sourceLabel} />
      {webPage.timestamp ? (
        <Detail.Metadata.Label
          title="Captured"
          text={`${formatDateTime(webPage.timestamp)} (${formatElapsedTime(webPage.timestamp)})`}
        />
      ) : null}
    </>
  );

  return <PreviewDetail notification={notification} markdown={markdown} metadata={metadata} />;
}
