import { Chat } from "../type";
import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";

export const AnswerDetailView = (props: { chat: Chat; markdown?: string | null | undefined }) => {
  const { chat, markdown } = props;
  const [isDetailedView] = useState(() => {
    return getPreferenceValues<{ isDetailedView: boolean }>().isDetailedView;
  });
  return (
    <List.Item.Detail
      markdown={markdown ?? `**${chat.question}**\n\n${chat.answer}`}
      metadata={
        isDetailedView ? (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Date" text={new Date(chat.created_at ?? 0).toLocaleString()} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="ID" text={chat.id} />
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
};
