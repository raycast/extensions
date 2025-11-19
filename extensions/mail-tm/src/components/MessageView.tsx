import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import TurndownService from "turndown";
import { getMessageDetail, markMessageAsSeen } from "../api";
import { MessageDetail } from "../types";
import { formatFullDate } from "../utils/formatters";
import { ERROR_MESSAGES, UI_STRINGS, HTML_CONVERTER_CONFIG } from "../constants";

const turndownService = new TurndownService({
  headingStyle: HTML_CONVERTER_CONFIG.HEADING_STYLE,
  codeBlockStyle: HTML_CONVERTER_CONFIG.CODE_BLOCK_STYLE,
});

turndownService.remove(HTML_CONVERTER_CONFIG.TAGS_TO_REMOVE);

interface MessageViewProps {
  messageId: string;
  token: string;
}

export function MessageView({ messageId, token }: MessageViewProps) {
  const [messageDetail, setMessageDetail] = useState<MessageDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadMessageDetail() {
    setIsLoading(true);
    try {
      const detail = await getMessageDetail(messageId, token);
      setMessageDetail(detail);

      if (!detail.seen) {
        await markMessageAsSeen(messageId, token);
      }
    } catch (error) {
      console.error(error);
      await showToast({
        style: Toast.Style.Failure,
        title: ERROR_MESSAGES.MESSAGE_LOAD_FAILED,
        message: error instanceof Error ? error.message : ERROR_MESSAGES.STANDARD_ERROR_MESSAGE,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMessageDetail();
  }, [messageId]);

  if (isLoading || !messageDetail) {
    return <Detail isLoading={true} />;
  }

  const bodyContent =
    messageDetail.html && messageDetail.html.length > 0
      ? turndownService.turndown(messageDetail.html.join("\n"))
      : messageDetail.text || UI_STRINGS.NO_CONTENT;

  const markdown = [`# ${messageDetail.subject || UI_STRINGS.NO_SUBJECT}`, "", bodyContent].join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={messageDetail.subject || UI_STRINGS.NO_SUBJECT}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={UI_STRINGS.METADATA_FROM}
            text={messageDetail.from.name || messageDetail.from.address}
          />
          <Detail.Metadata.Label title={UI_STRINGS.METADATA_EMAIL} text={messageDetail.from.address} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={UI_STRINGS.METADATA_TO}
            text={messageDetail.to.map((t) => t.address).join(", ")}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={UI_STRINGS.METADATA_DATE} text={formatFullDate(messageDetail.createdAt)} />
          {messageDetail.hasAttachments && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title={UI_STRINGS.METADATA_ATTACHMENTS}
                text={UI_STRINGS.METADATA_FILES(messageDetail.attachments?.length || 0)}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={UI_STRINGS.COPY_FULL_EMAIL_CONTENT}
            content={bodyContent}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action.CopyToClipboard
            title={UI_STRINGS.COPY_SENDER_EMAIL}
            content={messageDetail.from.address}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
