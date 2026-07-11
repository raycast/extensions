import { Detail, List } from "@raycast/api";
import { Chat } from "../types/chat";
import { EmptyView } from "./empty";
import { getSendMessageActionPanel } from "../actions/send-message";

export interface ChatViewProps {
  data: Chat[];
  onAction: () => void;
  preferences: Preferences;
  currentQuestion: string;
}

const AnswerDetailView = (props: {
  markdown?: string | null | undefined;
  provider?: string;
  model?: string;
  preferences: Preferences;
}) => {
  const { markdown, provider, preferences, model } = props;

  return (
    <>
      <List.Item.Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            {provider && <Detail.Metadata.Label title="Provider" text={`${provider}`} />}
            {model && <Detail.Metadata.Label title="Model" text={`${model}`} />}
            <Detail.Metadata.Separator />

            <Detail.Metadata.TagList title="Tradeoff">
              <Detail.Metadata.TagList.Item text="Quality" color={!preferences.tradeoff ? "#eed535" : "#000000"} />
              <Detail.Metadata.TagList.Item
                text="Cost"
                color={preferences.tradeoff === "cost" ? "#eed535" : "#000000"}
              />
              <Detail.Metadata.TagList.Item
                text="Latency"
                color={preferences.tradeoff === "latency" ? "#eed535" : "#000000"}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Documentation" target="https://docs.notdiamond.ai" text="Not Diamond" />
          </Detail.Metadata>
        }
      />
    </>
  );
};

export const ChatView = ({ data, onAction, preferences, currentQuestion }: ChatViewProps) => {
  const sortedChats = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return sortedChats.length === 0 ? (
    <EmptyView preferences={preferences} />
  ) : (
    <List.Section title="Questions">
      {sortedChats.map((sortedChat, index) => {
        return (
          <List.Item
            id={sortedChat.id}
            key={sortedChat.id}
            accessories={[{ text: `#${index + 1}` }]}
            title={sortedChat.question}
            detail={
              <AnswerDetailView
                markdown={sortedChat.answer}
                provider={sortedChat.provider}
                model={sortedChat.model}
                preferences={preferences}
              />
            }
            actions={getSendMessageActionPanel({ onAction, preferences, currentQuestion, answer: sortedChat.answer })}
          />
        );
      })}
    </List.Section>
  );
};
