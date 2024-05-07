import {
  List,
  ActionPanel,
  Action,
  Toast,
  Icon,
  showToast,
  Form,
  useNavigation,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { defaultProvider, getChatResponse, formatResponse, providers, processChunks } from "./api/llama3";
import { LocalStorage, Clipboard } from "@raycast/api";
import { formatDate } from "./api/helper";

export default function Chat({ launchContext }) {
  let toast = async (style, title, message) => {
    return await showToast({
      style,
      title,
      message,
    });
  };

  let default_chat_data = () => {
    return {
      currentChat: "New Chat",
      chats: [
        {
          name: "New Chat",
          creationDate: new Date(),
          provider: defaultProvider(),
          systemPrompt: "",
          messages: [],
        },
      ],
    };
  };

  let default_message_data = () => {
    return {
      prompt: "",
      answer: "",
      creationDate: new Date().toISOString(),
      id: new Date().getTime(),
      finished: false,
    };
  };

  let _setChatData = (chatData, setChatData, messageID, query = "", response = "", finished = false) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = getChat(chatData.currentChat, newChatData.chats).messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (query) messages[i].prompt = query;
          if (response) messages[i].answer = response;
          if (finished) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  let updateChatResponse = async (chatData, setChatData, messageID, query) => {
    let currentChat = getChat(chatData.currentChat, chatData.chats);
    const [provider, model, stream] = providers[currentChat.provider];

    _setChatData(chatData, setChatData, messageID, query, "");

    let elapsed, chars, charPerSec;
    let start = new Date().getTime();

    if (!stream) {
      let response = await getChatResponse(currentChat, query);
      _setChatData(chatData, setChatData, messageID, "", response);

      elapsed = (new Date().getTime() - start) / 1000;
      chars = response.length;
      charPerSec = (chars / elapsed).toFixed(1);
    } else {
      let response = "";
      let r = await getChatResponse(currentChat, query);
      let loadingToast = await toast(Toast.Style.Animated, "Response Loading");

      for await (const chunk of await processChunks(r, provider)) {
        response += chunk;
        response = formatResponse(response, provider);
        _setChatData(chatData, setChatData, messageID, "", response);

        elapsed = (new Date().getTime() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
        loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
      }
    }

    _setChatData(chatData, setChatData, messageID, "", "", true);

    await toast(
      Toast.Style.Success,
      "Response Finished",
      `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`
    );
  };

  let CreateChat = () => {
    const { pop } = useNavigation();

    const preferences = getPreferenceValues();
    const defaultProviderString = preferences["provider"];

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={(values) => {
                if (values.chatName === "") {
                  toast(Toast.Style.Failure, "Chat name cannot be empty");
                } else if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists");
                } else {
                  pop();
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    newChatData.chats.push({
                      name: values.chatName,
                      creationDate: new Date(),
                      systemPrompt: values.systemPrompt,
                      provider: values.provider,
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
          text="In each chat, Llama-3 will remember the previous messages you send in it."
        />
        <Form.TextField
          id="chatName"
          defaultValue={`New Chat ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`}
        />
        <Form.Description title="System Prompt" text="This prompt will be sent to Llama-3 to start the conversation." />
        <Form.TextArea id="systemPrompt" defaultValue="" />
        <Form.Description title="Llama-3 Provider" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={defaultProviderString}>
          <Form.Dropdown.Item title="Replicate (meta-llama-3-8b)" value="ReplicateLlama3_8B" />
          <Form.Dropdown.Item title="Replicate (meta-llama-3-70b)" value="ReplicateLlama3_70B" />
          <Form.Dropdown.Item title="DeepInfra (meta-llama-3-8b)" value="DeepInfraLlama3_8B" />
          <Form.Dropdown.Item title="DeepInfra (meta-llama-3-70b)" value="DeepInfraLlama3_70B" />
        </Form.Dropdown>
      </Form>
    );
  };

  let EditLastMessage = () => {
    let chat = getChat(chatData.currentChat);

    if (chat.messages.length === 0) {
      toast(Toast.Style.Failure, "No Messages in Chat");
      return;
    }

    const lastMessage = chat.messages[0].prompt;
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Message"
              onSubmit={(values) => {
                pop();

                // Similar to regenerate last message, we remove the last message and insert a new one,
                // but since prompt is changed, we need to update chat.messages[0].prompt,
                // so we no longer insert a null message, and hence don't pass query to updateChatResponse.
                chat.messages.shift();
                chat.messages.unshift(default_message_data());
                chat.messages[0].prompt = values.message;
                let messageID = chat.messages[0].id;
                updateChatResponse(chatData, setChatData, messageID).then(() => {
                  return;
                });
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="message" title="Message" defaultValue={lastMessage} />
      </Form>
    );
  };

  let RenameChat = () => {
    let chat = getChat(chatData.currentChat);

    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Rename Chat"
              onSubmit={(values) => {
                pop();

                // check if there is a currently generating message
                for (let i = 0; i < chat.messages.length; i++) {
                  if (!chat.messages[i].finished) {
                    toast(Toast.Style.Failure, "Cannot rename while loading response");
                    return;
                  }
                }

                // check if chat with new name already exists
                if (chatData.chats.map((x) => x.name).includes(values.chatName)) {
                  toast(Toast.Style.Failure, "Chat with that name already exists");
                  return;
                }

                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  getChat(chatData.currentChat, newChatData.chats).name = values.chatName;
                  newChatData.currentChat = values.chatName; // chat must be currentChat
                  return newChatData;
                });
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="chatName" title="Chat Name" defaultValue={chat.name} />
      </Form>
    );
  };

  let LlamaActionPanel = () => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to Llama-3"
          onAction={() => {
            if (searchText === "") {
              toast(Toast.Style.Failure, "Please Enter a Query");
              return;
            }

            const query = searchText;
            setSearchText("");
            toast(Toast.Style.Animated, "Response Loading");

            setChatData((x) => {
              let newChatData = structuredClone(x);
              let currentChat = getChat(chatData.currentChat, newChatData.chats);
              let newMessageID = new Date().getTime();

              currentChat.messages.unshift({
                prompt: query,
                answer: "",
                creationDate: new Date().toISOString(),
                id: newMessageID,
                finished: false,
              });

              (async () => {
                try {
                  await updateChatResponse(chatData, setChatData, newMessageID, query);
                } catch {
                  setChatData((oldData) => {
                    let newChatData = structuredClone(oldData);
                    getChat(chatData.currentChat, newChatData.chats).messages.shift();
                    return newChatData;
                  });
                  await toast(Toast.Style.Failure, "Llama-3 cannot process this message.");
                }
              })();
              return newChatData;
            });
          }}
        />
        <ActionPanel.Section title="Current Chat">
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Last Message"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);

              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No Messages in Chat");
                return;
              }

              await toast(Toast.Style.Animated, "Regenerating Last Message");

              // We first remove the last message, then insert a null (default) message.
              // This null message is not sent to the API (see getChatResponse() in api/llama3.jsx)
              let query = chat.messages[0].prompt;
              chat.messages.shift();
              chat.messages.unshift(default_message_data());
              let messageID = chat.messages[0].id;

              await updateChatResponse(chatData, setChatData, messageID, query);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Chat Transcript"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);
              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No Messages in Chat");
                return;
              }

              let transcript = "";
              for (let i = chat.messages.length - 1; i >= 0; i--) {
                transcript += `User: ${chat.messages[i].prompt}\n`;
                transcript += `Llama-3: ${chat.messages[i].answer}\n\n`;
              }
              await Clipboard.copy(transcript);
              await toast(Toast.Style.Success, "Chat Transcript Copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Edit Last Message"
            target={<EditLastMessage />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Last Message"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted messages!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Message",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    let chat = getChat(chatData.currentChat);

                    if (chat.messages.length === 0) {
                      toast(Toast.Style.Failure, "No Messages to Delete");
                      return;
                    }

                    // delete index 0
                    chat.messages.shift();
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages = chat.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Message Deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Rename Chat"
            target={<RenameChat />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel.Section>
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
                      setChatData(default_chat_data());
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
          <Action
            icon={Icon.Trash}
            title="Delete All Chats"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted chats!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete ALL Chats Forever",
                  style: Action.Style.Destructive,
                  onAction: async () => {
                    await confirmAlert({
                      title: "Are you sure?",
                      message: "Please confirm that you want to delete all chats!",
                      icon: Icon.Trash,
                      primaryAction: {
                        title: "Delete ALL Chats Forever",
                        style: Action.Style.Destructive,
                        onAction: () => {
                          setChatData(default_chat_data());
                        },
                      },
                    });
                  },
                },
              });
            }}
            style={Action.Style.Destructive}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  let [chatData, setChatData] = useState(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("chatData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);

        // Legacy feature to regenerate last message, from raycast-gemini.
        // This feature no longer works because of how we handle streaming.
        //
        // if (getChat(newData.currentChat, newData.chats).messages[0]?.finished === false) {
        //   let currentChat = getChat(newData.currentChat, newData.chats);
        //   currentChat.messages[0].answer = "";
        //
        //   toast(Toast.Style.Animated, "Regenerating Last Message");
        //   await (async () => {
        //     try {
        //       await updateChatResponse(newData, setChatData, "");
        //       toast(Toast.Style.Success, "Response Loaded");
        //     } catch {
        //       setChatData((oldData) => {
        //         let newChatData = structuredClone(oldData);
        //         getChat(newData.currentChat, newChatData.chats).messages.shift();
        //         return newChatData;
        //       });
        //       toast(Toast.Style.Failure, "Llama-3 cannot process this message.");
        //     }
        //   })();
        // }

        setChatData(structuredClone(newData));
      } else {
        const newChatData = default_chat_data();
        await LocalStorage.setItem("chatData", JSON.stringify(newChatData));
        setChatData(newChatData);
      }

      if (launchContext?.query) {
        setChatData((oldData) => {
          let newChatData = structuredClone(oldData);
          let newChatName = `From Quick AI at ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`;
          newChatData.chats.push({
            name: newChatName,
            creationDate: new Date(),
            provider: defaultProvider(), // if called from an AI action, the provider used must be the default
            systemPrompt: "",
            messages: [
              {
                prompt: launchContext.query,
                answer: launchContext.response,
                creationDate: new Date().toISOString(),
                id: new Date().getTime(),
                finished: true,
              },
            ],
          });
          newChatData.currentChat = newChatName;
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
      <List.EmptyView icon={Icon.SpeechBubble} title="Send a Message to Llama-3 to get started." />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={getChat(chatData.currentChat).messages.length > 0}
      searchBarPlaceholder="Ask Llama-3..."
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
              icon={Icon.SpeechBubble}
              title="Send a Message to Llama-3 to get started."
              actions={<LlamaActionPanel />}
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
              actions={<LlamaActionPanel idx={i} />}
            />
          );
        });
      })()}
    </List>
  );
}
