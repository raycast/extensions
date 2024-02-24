import {
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  Toast,
  Icon,
  showToast,
  Form,
  useNavigation,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import Gemini from "gemini-ai";
import fetch from "node-fetch-polyfill";
import { LocalStorage } from "@raycast/api";

export default function Chat({ launchContext }) {
  let toast = async (style, title, message) => {
    await showToast({
      style,
      title,
      message,
    });
  };

  const { apiKey } = getPreferenceValues();
  const gemini = new Gemini(apiKey, { fetch });

  let CreateChat = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={(values) => {
                if (values.chatName === "") {
                  toast(Toast.Style.Failure, "Chat must have a name.");
                } else if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists.");
                } else {
                  pop();
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
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
        <Form.Description
          title="Chat Name"
          text="In each chat, Gemini will remember the previous messages you send in it."
        />
        <Form.TextField id="chatName" />
      </Form>
    );
  };

  let GeminiActionPanel = () => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to Gemini"
          onAction={() => {
            if (searchText === "") {
              toast(Toast.Style.Failure, "Please Enter a Query");
              return;
            }

            const query = searchText;
            setSearchText("");
            if (
              getChat(chatData.currentChat).messages.length == 0 ||
              getChat(chatData.currentChat).messages[0].finished
            ) {
              toast(Toast.Style.Animated, "Response Loading", "Please Wait");
              setChatData((x) => {
                let newChatData = structuredClone(x);
                let currentChat = getChat(chatData.currentChat, newChatData.chats);

                currentChat.messages.unshift({
                  prompt: query,
                  answer: "",
                  creationDate: new Date().toISOString(),
                  finished: false,
                });

                (async () => {
                  try {
                    let currentChat = getChat(chatData.currentChat);
                    let aiChat = gemini.createChat({
                      messages: currentChat.messages.map((x) => [x.prompt, x.answer]),
                    });

                    await aiChat.ask(query, {
                      stream: (x) => {
                        setChatData((oldData) => {
                          let newChatData = structuredClone(oldData);
                          getChat(chatData.currentChat, newChatData.chats).messages[0].answer += x;
                          return newChatData;
                        });
                      },
                    });

                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages[0].finished = true;
                      return newChatData;
                    });

                    toast(Toast.Style.Success, "Response Loaded");
                  } catch {
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages.shift();
                      return newChatData;
                    });
                    toast(Toast.Style.Failure, "Gemini cannot process this message.");
                  }
                })();
                return newChatData;
              });
            } else {
              toast(Toast.Style.Failure, "Please Wait", "Only one message at a time.");
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
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No Chats After Current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
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
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === 0) toast(Toast.Style.Failure, "No Chats Before Current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
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
                  title: "Delete Chat Forever",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    let chatIdx = 0;
                    for (let i = 0; i < chatData.chats.length; i++) {
                      if (chatData.chats[i].name === chatData.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }
                    if (chatData.chats.length === 1) {
                      toast(Toast.Style.Failure, "Cannot delete only chat");
                      return;
                    }
                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].name;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
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
  let formatDate = (dateToCheckISO) => {
    const dateToCheck = new Date(dateToCheckISO);
    if (dateToCheck.toDateString() === new Date().toDateString()) {
      return `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    } else {
      return `${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}`;
    }
  };

  let [chatData, setChatData] = useState(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("chatData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);

        if (getChat(newData.currentChat, newData.chats).messages[0]?.finished === false) {
          let currentChat = getChat(newData.currentChat, newData.chats);
          console.log(currentChat);
          let aiChat = gemini.createChat({
            messages: currentChat.messages.map((x) => [x.prompt, x.answer]),
          });
          currentChat.messages[0].answer = "";
          console.log(toast);
          toast(Toast.Style.Animated, "Regenerating Last Message");
          (async () => {
            try {
              await aiChat.ask(getChat(newData.currentChat, newData.chats).messages[0].prompt, {
                stream: (x) => {
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    getChat(newData.currentChat, newChatData.chats).messages[0].answer += x;
                    return newChatData;
                  });
                },
              });

              setChatData((oldData) => {
                let newChatData = structuredClone(oldData);
                getChat(newData.currentChat, newChatData.chats).messages[0].finished = true;
                return newChatData;
              });

              toast(Toast.Style.Success, "Response Loaded");
            } catch {
              setChatData((oldData) => {
                let newChatData = structuredClone(oldData);
                getChat(newData.currentChat, newChatData.chats).messages.shift();
                return newChatData;
              });
              toast(Toast.Style.Failure, "Gemini cannot process this message.");
            }
          })();
        }

        setChatData(structuredClone(newData));
      } else {
        const newChatData = {
          currentChat: "New Chat",
          chats: [
            {
              name: "New Chat",
              creationDate: new Date(),
              messages: [],
            },
          ],
        };
        await LocalStorage.setItem("chatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }

      if (launchContext?.query) {
        setChatData((oldData) => {
          let newChatData = structuredClone(oldData);
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
                prompt: launchContext.query,
                answer: launchContext.response,
                creationDate: new Date().toISOString(),
                finished: true,
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

  let getChat = (target, customChat = chatData.chats) => {
    for (const chat of customChat) {
      if (chat.name === target) return chat;
    }
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.Stars} title="Send a Message to Gemini to get started." />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={getChat(chatData.currentChat).messages.length > 0}
      searchBarPlaceholder="Ask Gemini..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newValue) => {
            setChatData((oldData) => ({
              ...oldData,
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
        let chat = getChat(chatData.currentChat);
        if (!chat.messages.length) {
          return (
            <List.EmptyView
              icon={Icon.Stars}
              title="Send a Message to Gemini to get started."
              actions={<GeminiActionPanel />}
            />
          );
        }
        return chat.messages.map((x, i) => {
          return (
            <List.Item
              title={x.prompt}
              subtitle={formatDate(x.creationDate)}
              detail={<List.Item.Detail markdown={x.answer} />}
              key={x.prompt + x.creationDate}
              actions={<GeminiActionPanel idx={i} />}
            />
          );
        });
      })()}
    </List>
  );
}
