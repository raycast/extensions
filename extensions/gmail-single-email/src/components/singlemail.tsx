import { ActionPanel, Detail, Toast, showToast, Icon } from "@raycast/api";
import { generateQuery, getGMailMessages } from "../lib/gmail";
import { useCachedPromise } from "@raycast/utils";
import { getErrorMessage } from "../lib/utils";
import { getGMailClient } from "../lib/withGmailClient";
import {
  MessageMarkAsReadAction,
  MessageMarkAsUnreadAction,
  MessagesRefreshAction,
  MessageCopyIdAction,
  MessageOpenInBrowserAction,
  MessageDeleteAction,
  MessageCopyWebUrlAction,
  MessageMarkAsArchived,
  MessageDownloadAttachmentAction,
} from "./message/actions";
import { getAddressParts, getMessageAttachments, getMessageInternalDate, extractPlainTextBody } from "./message/utils";
import { getGMailMessageHeaderValue } from "../lib/gmail";

export function SingleEmailDetailView(props: {
  baseQuery?: string[] | undefined;
  emptyMessage?: string;
  maxResults?: number;
}) {
  // We're only using the baseQuery, not user search input, so no searchText state needed
  const query = generateQuery({ baseQuery: props.baseQuery });
  const { gmail } = getGMailClient();
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(gmail, q, props.maxResults || 1);
    },
    [query],
    { keepPreviousData: false },
  );

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }

  const message = data && data.length > 0 ? data[0].data : undefined;

  if (!message) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={props.emptyMessage || "No emails found"}
        actions={
          <ActionPanel>
            <MessagesRefreshAction onRevalidate={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  // Extract email details
  const subject = getGMailMessageHeaderValue(message, "Subject") || "<No Subject>";
  const from = getGMailMessageHeaderValue(message, "From");
  const fromParts = getAddressParts(from);
  const to = getGMailMessageHeaderValue(message, "To");
  const toRecipients = to?.split(",");
  const cc = getGMailMessageHeaderValue(message, "Cc");
  const ccRecipients = cc?.split(",");
  const internalDate = getMessageInternalDate(message);
  const attachments = getMessageAttachments(message);
  const webLink = `https://mail.google.com/mail/u/0/#inbox/${message.id}`;

  // Extract body content
  const bodyContent = extractPlainTextBody(message?.payload);

  // Build the main markdown content
  let markdown = `# ${subject.replace(/([\[\]\\`*_{}()#+\-.!])/g, '\\$1')}\n\n`;
  // Use extracted body or fallback to snippet
  markdown += bodyContent || message?.snippet || "No content available.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={subject}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="From"
            text={`${fromParts?.name || ""} ${fromParts?.email ? `<${fromParts.email}>` : ""}`}
          />
          {toRecipients && toRecipients.length > 0 && (
            <Detail.Metadata.Label title="To" text={toRecipients.join(", ")} />
          )}
          {ccRecipients && ccRecipients.length > 0 && (
            <Detail.Metadata.Label title="Cc" text={ccRecipients.join(", ")} />
          )}
          <Detail.Metadata.Label title="Date" text={internalDate?.toLocaleString() || "Unknown"} />
          <Detail.Metadata.Separator />
          {attachments && attachments.length > 0 && (
            <Detail.Metadata.Label
              title={`Attachment${attachments.length > 1 ? "s" : ""}`}
              text={attachments.map((a) => a.filename).join(", ")}
              icon={Icon.Paperclip}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open in Browser" target={webLink} text="Gmail Link" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MessageOpenInBrowserAction message={message} onOpen={revalidate} />
          </ActionPanel.Section>
          {attachments && attachments.length > 0 && (
            <ActionPanel.Section title="Attachments">
              {attachments.map((att) => (
                <MessageDownloadAttachmentAction key={att.attachmentId} message={message} attachment={att} />
              ))}
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <MessageMarkAsReadAction message={message} onRevalidate={revalidate} />
            <MessageMarkAsUnreadAction message={message} onRevalidate={revalidate} />
            <MessageMarkAsArchived message={message} onRevalidate={revalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageDeleteAction message={message} onRevalidate={revalidate} />
            <MessagesRefreshAction onRevalidate={revalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageCopyWebUrlAction message={message} />
            <MessageCopyIdAction message={message} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
