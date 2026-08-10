import { ActionPanel, List } from "@raycast/api";
import { EmptyView } from "./empty";
import { runAppleScriptSync } from "run-applescript";
import { PreferencesActionSection, PrimaryAction } from "../../action/action";
import { AnswerDetailView } from "../../ask";
import { Chat } from "../../model/type";
import { closeMainWindow } from "@raycast/api";

export interface ChatViewProps {
  data: Chat[];
  ques: string;
  ans: string;
  conve: string;
}

export const ChatView = ({ data, ques, ans, conve }: ChatViewProps) => {
  const sortedChats = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const returnBlock = () => {
    console.log("dasdadad");
    runAppleScriptSync(`tell application "CharmingMac" to save in "跳转到莫斯" conversation "${conve}" `);
    closeMainWindow();
  };

  const getActionPanel = () => (
    <ActionPanel>
      <PrimaryAction title=/*"跳转到莫斯"*/ "Go Charming" onAction={returnBlock} />
      <PreferencesActionSection />
    </ActionPanel>
  );

  return sortedChats.length === 0 ? (
    <EmptyView />
  ) : (
    <List.Section title="Questions" /*"问题"*/ subtitle={""}>
      {sortedChats.map((sortedChat, _) => {
        return (
          <List.Item
            id={"ssss"}
            key={"ssss"}
            accessories={[{ text: `#1` }]}
            title={ques}
            detail={<AnswerDetailView markdown={ans.length > 0 ? `${ans}` : `Waiting for Charming....`} />}
            actions={ques.length > 0 ? getActionPanel() : null}
          />
        );
      })}
    </List.Section>
  );
};
