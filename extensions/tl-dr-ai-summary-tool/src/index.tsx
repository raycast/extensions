import { Detail, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { Icon, ActionPanel, Action, List } from "@raycast/api";
import { useChat } from "./hook/useChat";
import { ChatBox, InputBox, Message } from "./type";
import { isKeyReady } from "./utils/jwt";

let globalId = 1;
export default function Command(props: { messages?: Message[] }) {
  const [chatbox, setChatBox] = useState<ChatBox>({
    messages: props.messages ? props.messages : [],
    boxId: ++globalId,
  });
  const chat = useChat(chatbox);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [input, setInput] = useState<InputBox>({ text: "" });

  if (!isKeyReady()) {
    return (
      <Detail
        markdown={`# Welcome \n 
    
    
You are missing the ZHIPU API key. Please use \`↩︎\` to start setting it up. \n  
If you don't have a key yet, please go to [https://open.bigmodel.cn/usercenter/apikeys](https://open.bigmodel.cn/usercenter/apikeys) to apply for one for free.`}
        actions={
          <ActionPanel>
            <Action title="Configure Extension" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  useEffect(() => {
    setChatBox({ ...chatbox, messages: chat.messages });
  }, [chat.messages]);

  // update load from ask
  useEffect(() => {
    setLoading(chat.isLoading);
  }, [chat.isLoading]);
  // const question = useQuestion({ initialQuestion: "", disableAutoLoad: true });

  const getActionPanel = () => (
    <ActionPanel>
      <Action
        title={"生成摘要"}
        icon={Icon.ArrowRight}
        onAction={async () => {
          await chat.ask(input.text);
        }}
      />
      <Action title="Configure Extension" onAction={openExtensionPreferences} />
    </ActionPanel>
  );

  const sortedMessages = chatbox.messages.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <List
      searchText={input.text}
      isShowingDetail={true}
      filtering={false}
      isLoading={isLoading}
      onSearchTextChange={(input) => {
        setInput({
          text: input,
        });
      }}
      throttle={false}
      navigationTitle={"TL;DR 太长不想读"}
      actions={getActionPanel()}
      selectedItemId={`${sortedMessages.length > 0 ? sortedMessages[0].id : undefined}`}
      onSelectionChange={() => {}}
      searchBarPlaceholder={chatbox.messages.length > 0 ? "请对文章提问" : "请粘贴文章链接"}
    >
      {chatbox.messages.length == 0 ? (
        <List.EmptyView />
      ) : (
        <List.Section title="Result" subtitle={`${chatbox.messages.length}`}>
          {sortedMessages.map((msg: Message, i) => {
            return (
              // <List.Item title="摘要" detail={<List.Item.Detail markdown={`# Hello World \n ${33}`}></List.Item.Detail>}/>
              <List.Item
                id={`${msg.id}`}
                key={`${i}`}
                actions={isLoading ? undefined : getActionPanel()}
                title={`${msg.question.slice(0, 20)}`}
                detail={<List.Item.Detail markdown={`${msg.answer}`}></List.Item.Detail>}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
