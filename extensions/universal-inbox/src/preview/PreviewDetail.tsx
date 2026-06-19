import { getNotificationHtmlUrl, Notification } from "../notification";
import { getThirdPartyItemSourceLabel } from "../third_party_item";
import { Detail, ActionPanel, Action } from "@raycast/api";
import { ReactNode, useMemo } from "react";

interface PreviewDetailProps {
  notification: Notification;
  markdown: string;
  /** Inner `Detail.Metadata.*` items — rendered below the notification Type row. */
  metadata?: ReactNode;
}

/**
 * Shared wrapper for every notification preview: renders a `Detail` with the
 * standard "Open in Browser" action, and a metadata sidebar whose first row is
 * always the notification type, followed by the preview-specific `metadata`.
 */
export function PreviewDetail({ notification, markdown, metadata }: PreviewDetailProps) {
  const notificationHtmlUrl = useMemo(() => getNotificationHtmlUrl(notification), [notification]);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={getThirdPartyItemSourceLabel(notification.source_item)} />
          {metadata ? <Detail.Metadata.Separator /> : null}
          {metadata}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={notificationHtmlUrl} />
        </ActionPanel>
      }
    />
  );
}
