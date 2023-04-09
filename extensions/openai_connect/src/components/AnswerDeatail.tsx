import { encode } from "../libs/encoder";
import { Chat } from "../types";
import { ActionPanel, getPreferenceValues, List, showToast, useNavigation, Toast, clearSearchBar } from "@raycast/api";
import type { AnswerDetailViewProps } from "../types";

import { FC } from "react";

export const AnswerDetailView: FC<AnswerDetailViewProps> = ({ chat, markdown, isHideMeta }) => {
  const questionToken = encode(chat.question).length;
  const answerToken = encode(chat.answer).length;
  return (
    <List.Item.Detail
      markdown={`**${chat.question}**\n\n${chat.answer}`}
      metadata={
        isHideMeta ? null : (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.TagList title="Model">
              <List.Item.Detail.Metadata.TagList.Item text={chat.model} color={"#eed535"} />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Label title={"Date"} text={new Date(chat.created_at).toLocaleString()} />
            <List.Item.Detail.Metadata.Label
              title={"Question Token Count"}
              icon="model"
              text={questionToken.toLocaleString()}
            />
            <List.Item.Detail.Metadata.Label
              title={"Answer Token Count"}
              icon="model"
              text={answerToken.toLocaleString()}
            />
            <List.Item.Detail.Metadata.Label
              title={"Total Token Count"}
              icon="model"
              text={(answerToken + questionToken).toLocaleString()}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title={"Id"} text={chat.id} />
            <List.Item.Detail.Metadata.Label title={"Conversaton Id"} text={chat.conversationId} />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
};
