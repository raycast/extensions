import {
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  Toast,
  showToast,
  Icon,
  Form,
  useNavigation,
  confirmAlert,
  LocalStorage,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { global_model, enable_streaming, openai } from "./hook/configAPI";

interface ChatData {
  currentChat: string;
  chats: Chat[];
}

interface Chat {
  name: string;
  creationDate: Date;
  modelName?: string;
  messages: Message[];
}

interface Message {
  prompt: string;
  answer: string;
  creationDate: string;
  finished: boolean;
  modelName: string;
}

const model_override = getPreferenceValues<{ model_chat: string }>().model_chat;
const APIprovider = "Groq";

export default function Chat({ launchContext }: { launchContext?: { query?: string; response?: string } }) {
  const model = model_override === "global" ? global_model : model_override;
  const [chatData, setChatData] = useState<ChatData | null>(null);

  const CreateChat = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={(values: { chatName: string }) => {
                if (values.chatName === "") {
                  showToast({ style: Toast.Style.Failure, title: "Chat must have a name." });
                } else if (chatData?.chats.map((x) => x.name).includes(values.chatName)) {
                  showToast({ style: Toast.Style.Failure, title: "Chat with that name already exists." });
                } else {
                  pop();
                  setChatData((oldData) => {
                    if (!oldData) return oldData;
                    const newChatData = structuredClone(oldData);
                    newChatData.chats.push({
                      name: values.chatName,
                      creationDate: new Date(),
                      messages: [],
                    });
                    newChatData.currentChat = values.chatName;

                    return newChatData;
                  });
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="chatName"
          title="Conversation Name"
          placeholder="Hawaii Trip"
          info={`In each chat, ${APIprovider} will remember the previous messages you send in it.`}
        />
      </Form>
    );
  };

  const OpenAIActionPanel = () => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title={`Send to ${APIprovider}`}
          onAction={() => {
            if (searchText === "") {
              showToast({ style: Toast.Style.Failure, title: "Please Enter a Query" });
              return;
            }

            const query = searchText;
            setSearchText("");
            if (
              chatData &&
              (getChat(chatData.currentChat).messages.length === 0 ||
                getChat(chatData.currentChat).messages[0].finished)
            ) {
              showToast({ style: Toast.Style.Animated, title: "Response Loading" });
              setChatData((x) => {
                if (!x) return x;
                const newChatData = structuredClone(x);
                const currentChat = getChat(chatData.currentChat, newChatData.chats);

                currentChat.messages.unshift({
                  prompt: query,
                  answer: "",
                  creationDate: new Date().toISOString(),
                  finished: false,
                  modelName: model,
                });

                (async () => {
                  try {
                    const currentChat = getChat(chatData.currentChat);
                    const messages = [];
                    currentChat.messages.map((x) => {
                      messages.push({ role: "assistant", content: x.answer });
                      messages.push({ role: "user", content: x.prompt });
                    });
                    messages.push({ role: "system", content: "Be a concise and helpful" });
                    messages.reverse();

                    const response = await openai.chat.completions.create({
                      model: model,
                      messages: [...messages, { role: "user", content: query }],
                      stream: enable_streaming,
                    });

                    let answer = "";
                    for await (const message of response) {
                      answer += message.choices[0].delta.content || "";
                      setChatData((oldData) => {
                        if (!oldData) return oldData;
                        const newChatData = structuredClone(oldData);
                        getChat(chatData.currentChat, newChatData.chats).messages[0].answer = answer;
                        return newChatData;
                      });
                    }

                    setChatData((oldData) => {
                      if (!oldData) return oldData;
                      const newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages[0].finished = true;
                      return newChatData;
                    });

                    showToast({ style: Toast.Style.Success, title: "Response Loaded" });
                  } catch (error) {
                    console.error(`Error processing message with ${APIprovider}:`, error);
                    setChatData((oldData) => {
                      if (!oldData) return oldData;
                      const newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages.shift();
                      return newChatData;
                    });
                    showToast({
                      style: Toast.Style.Failure,
                      title: `${APIprovider} cannot process this message`,
                      message: error as string,
                    });
                  }
                })();
                return newChatData;
              });
            } else {
              showToast({ style: Toast.Style.Failure, title: "Please Wait", message: "Only one message at a time." });
            }
          }}
        />
        <ActionPanel.Section title="Manage Chats">
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Chat"
            target={<CreateChat />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.ArrowDown}
            title="Next Chat"
            onAction={() => {
              if (!chatData) return;
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) {
                showToast({ style: Toast.Style.Failure, title: "No Chats After Current" });
              } else {
                setChatData((oldData) => ({
                  ...oldData!,
                  currentChat: chatData.chats[chatIdx + 1].name,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <Action
            icon={Icon.ArrowUp}
            title="Previous Chat"
            onAction={() => {
              if (!chatData) return;
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === 0) {
                showToast({ style: Toast.Style.Failure, title: "No Chats Before Current" });
              } else {
                setChatData((oldData) => ({
                  ...oldData!,
                  currentChat: chatData.chats[chatIdx - 1].name,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Danger zone">
          <Action
            icon={Icon.Trash}
            title="Delete Chat"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover this chat.",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Chat",
                  style: Alert.ActionStyle.Destructive,
                  onAction: () => {
                    if (!chatData) return;
                    let chatIdx = 0;
                    for (let i = 0; i < chatData.chats.length; i++) {
                      if (chatData.chats[i].name === chatData.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }
                    if (chatData.chats.length === 1) {
                      showToast({ style: Toast.Style.Failure, title: "Cannot delete only chat" });
                      return;
                    }
                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        if (!oldData) return oldData;
                        const newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].name;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        if (!oldData) return oldData;
                        const newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx, 1);
                        newChatData.currentChat = newChatData.chats[chatIdx].name;
                        return newChatData;
                      });
                    }
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
            style={Action.Style.Destructive}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("chatData");
      if (storedChatData) {
        const newData: ChatData = JSON.parse(storedChatData as string);

        if (getChat(newData.currentChat, newData.chats).messages[0]?.finished === false) {
          const currentChat = getChat(newData.currentChat, newData.chats);
          console.log(currentChat);
          const messages = currentChat.messages.map((x) => ({
            role: "user",
            content: x.prompt,
          }));

          const response = await openai.chat.completions.create({
            model: model,
            messages: [...messages, { role: "user", content: currentChat.messages[0].prompt }],
            stream: enable_streaming,
          });

          let answer = "";
          for await (const message of response) {
            answer += message.choices[0].delta.content || "";
            setChatData((oldData) => {
              if (!oldData) return oldData;
              const newChatData = structuredClone(oldData);
              getChat(newData.currentChat, newChatData.chats).messages[0].answer = answer;
              return newChatData;
            });
          }

          setChatData((oldData) => {
            if (!oldData) return oldData;
            const newChatData = structuredClone(oldData);
            getChat(newData.currentChat, newChatData.chats).messages[0].finished = true;
            return newChatData;
          });

          showToast({ style: Toast.Style.Success, title: "Response Loaded" });
        }

        setChatData(structuredClone(newData));
      } else {
        const newChatData: ChatData = {
          currentChat: "New Chat",
          chats: [
            {
              name: "New Chat",
              creationDate: new Date(),
              modelName: model,
              messages: [],
            },
          ],
        };
        await LocalStorage.setItem("chatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }

      if (launchContext?.query) {
        setChatData((oldData) => {
          if (!oldData) return oldData;
          const newChatData = structuredClone(oldData);
          newChatData.chats.push({
            name: `From Quick AI at ${new Date().toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`,
            creationDate: new Date(),
            messages: [
              {
                prompt: launchContext.query as string,
                answer: launchContext.response as string,
                creationDate: new Date().toISOString(),
                finished: true,
                modelName: model,
              },
            ],
          });
          newChatData.currentChat = `From Quick AI at ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`;
          return newChatData;
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await LocalStorage.setItem("chatData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  const [searchText, setSearchText] = useState("");

  const getChat = (target: string, customChat: Chat[] = chatData!.chats): Chat => {
    for (const chat of customChat) {
      if (chat.name === target) return chat;
    }
    throw new Error("Chat not found");
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.Stars} title={`Send a Message to ${APIprovider} to get started.`} />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={getChat(chatData.currentChat).messages.length > 0}
      searchBarPlaceholder={`Ask ${APIprovider}...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newValue) => {
            setChatData((oldData) => ({
              ...oldData!,
              currentChat: newValue,
            }));
          }}
          value={chatData.currentChat}
        >
          {chatData.chats.map((x) => {
            return <List.Dropdown.Item title={x.name} value={x.name} key={x.name} />;
          })}
        </List.Dropdown>
      }
    >
      {(() => {
        const chat = getChat(chatData.currentChat);
        if (!chat.messages.length) {
          return (
            <List.EmptyView
              icon={Icon.Stars}
              title={`Send a Message to ${APIprovider} to get started.`}
              actions={<OpenAIActionPanel />}
            />
          );
        }
        return chat.messages.map((x, i) => {
          return (
            <List.Item
              title={x.prompt}
              accessories={[
                {
                  date: new Date(x.creationDate),
                  tooltip: `Message sent on: ${new Date(x.creationDate).toLocaleString()}`,
                },
              ]}
              detail={<List.Item.Detail markdown={`\`\`\`${x.modelName}\`\`\`\n\n${x.answer}`} />}
              key={x.prompt + x.creationDate}
              actions={<OpenAIActionPanel />}
            />
          );
        });
      })()}
    </List>
  );
}
