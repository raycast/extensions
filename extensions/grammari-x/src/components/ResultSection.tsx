import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { PreferencesActionSection } from "../actions/preferences";
import { SaveActionSection } from "../actions/save";
import { Chat } from "../types";
import { AnswerDetailView } from "../views/answer-detail";
import { useSavedChat } from "../utils/savedChatUtil";

export default function ResultSection({
  chat,
  isShowingDetail,
  setIsShowingDetail,
}: {
  chat: Chat;
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
}) {
  const savedChat = useSavedChat();
  return (
    <List.Section title="Result">
      {chat.answer ? (
        <List.Item
          title={chat.answer}
          detail={<AnswerDetailView chat={chat} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={chat.answer} />
              <Action title="Toggle Full Text" icon={Icon.Text} onAction={() => setIsShowingDetail(!isShowingDetail)} />
              <Action.Paste content={chat.answer} />
              <SaveActionSection onSaveAnswerAction={() => savedChat.add(chat)} />
              <PreferencesActionSection />
            </ActionPanel>
          }
        />
      ) : null}
    </List.Section>
  );
}
