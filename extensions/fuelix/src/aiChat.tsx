import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  getPreferenceValues,
  getSelectedText,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import getResponse, { ChatMessage } from "./api/fuelix";
import { models } from "./api/models";

interface Message {
  prompt: string;
  answer: string;
  creationDate: string;
  finished: boolean;
}

interface Chat {
  name: string;
  creationDate: Date;
  messages: Message[];
  model: string;
}

interface ChatData {
  currentChat: string;
  chats: Chat[];
}

interface LaunchContext {
  query?: string;
  response?: string;
}

interface Preferences {
  defaultModel: string;
  apiKey: string;
  apiBaseURL: string;
}

interface FormValues {
  chatName: string;
  model: string;
}

export default function Chat({ launchContext }: { launchContext?: LaunchContext }) {
  const toast = async (style: Toast.Style, title: string, message?: string) => {
    await showToast({
      style,
      title,
      message,
    });
  };

  const { defaultModel, apiKey, apiBaseURL } = getPreferenceValues<Preferences>();

  const createNewChatName = (prefix = "New Chat ") => {
    if (!chatData) return prefix + "1";
    const existingChatNames = chatData.chats.map((x) => x.name);
    const newChatNumbers = existingChatNames
      .filter((x) => x.match(/^New Chat \d+$/))
      .map((x) => parseInt(x.replace(prefix, "")));
    let lowestAvailableNumber = 1;
    while (newChatNumbers.includes(lowestAvailableNumber)) {
      lowestAvailableNumber++;
    }
    return prefix + lowestAvailableNumber;
  };

  const CreateChat = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={(values: FormValues) => {
                const newName = values.chatName.trim() || createNewChatName();
                if (chatData && chatData.chats.map((x) => x.name).includes(newName)) {
                  showFailureToast("Chat with that name already exists.");
                } else {
                  pop();
                  setChatData((oldData) => {
                    if (!oldData) return oldData;
                    const newChatData = structuredClone(oldData);
                    newChatData.chats.push({
                      name: newName,
                      creationDate: new Date(),
                      messages: [],
                      model: values.model === "default" ? defaultModel : values.model,
                    });
                    newChatData.currentChat = newName;

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
          text="In each chat, Fuelix will remember the previous messages you send in it."
        />
        <Form.TextField id="chatName" />
        <Form.Description
          title="Chat Model"
          text="The model used for this chat. Setting this to Default will use the model you set as Default for the extension in Preferences."
        />
        <Form.Dropdown id="model" defaultValue="default">
          <Form.Dropdown.Item title="Default" value="default" />
          {models.map((model: { title: string; value: string }) => (
            <Form.Dropdown.Item key={model.value} title={model.title} value={model.value} />
          ))}
        </Form.Dropdown>
      </Form>
    );
  };

  const FuelIXActionPanel = () => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to Fuelix"
          onAction={() => {
            if (searchText === "") {
              toast(Toast.Style.Failure, "Please Enter a Query");
              return;
            }

            const query = searchText;
            setSearchText("");
            if (
              !chatData ||
              getChat(chatData.currentChat)?.messages.length === 0 ||
              getChat(chatData.currentChat)?.messages[0]?.finished
            ) {
              toast(Toast.Style.Animated, "Response Loading", "Please Wait");

              // Get previous messages BEFORE adding the new message
              const currentChatBeforeUpdate = getChat(chatData!.currentChat);
              const previousMessages = currentChatBeforeUpdate?.messages || [];
              const currentModel = currentChatBeforeUpdate?.model ?? defaultModel;

              // Add the new message to state first
              setChatData((x) => {
                if (!x) return x;
                const newChatData = structuredClone(x);
                const currentChat = getChat(chatData!.currentChat, newChatData.chats);

                if (currentChat) {
                  currentChat.messages.unshift({
                    prompt: query,
                    answer: "",
                    creationDate: new Date().toISOString(),
                    finished: false,
                  });
                }
                return newChatData;
              });

              (async () => {
                try {
                  // Build messages array for better context handling
                  const messages: ChatMessage[] = [];

                  // Use the previous messages we captured before adding the new message
                  // Messages are stored in reverse chronological order (newest first)
                  const reversedPreviousMessages = [...previousMessages].reverse(); // Get chronological order (oldest first)

                  reversedPreviousMessages.forEach((msg) => {
                    if (msg.answer.trim() && msg.finished) {
                      // Only add completed messages
                      messages.push({ role: "user", content: msg.prompt });
                      messages.push({ role: "assistant", content: msg.answer });
                    }
                  });

                  // Add current user message
                  messages.push({ role: "user", content: query });

                  const result = await getResponse({
                    prompt: messages,
                    modelName: currentModel,
                    apiKey: apiKey,
                    apiBaseURL,
                  });

                  setChatData((oldData) => {
                    if (!oldData) return oldData;
                    const newChatData = structuredClone(oldData);
                    const chat = getChat(chatData!.currentChat, newChatData.chats);
                    if (chat && chat.messages[0]) {
                      chat.messages[0].answer = result;
                      chat.messages[0].finished = true;
                    }
                    return newChatData;
                  });

                  toast(Toast.Style.Success, "Response Loaded");
                } catch (e) {
                  setChatData((oldData) => {
                    if (!oldData) return oldData;
                    const newChatData = structuredClone(oldData);
                    const chat = getChat(chatData!.currentChat, newChatData.chats);
                    if (chat) {
                      chat.messages.shift();
                    }
                    return newChatData;
                  });
                  const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
                  toast(Toast.Style.Failure, errorMessage);
                }
              })();
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
              if (!chatData) return;
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].name === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) {
                toast(Toast.Style.Failure, "No Chats After Current");
              } else {
                setChatData((oldData) => {
                  if (!oldData) return oldData;
                  return {
                    ...oldData,
                    currentChat: chatData.chats[chatIdx + 1].name,
                  };
                });
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
                toast(Toast.Style.Failure, "No Chats Before Current");
              } else {
                setChatData((oldData) => {
                  if (!oldData) return oldData;
                  return {
                    ...oldData,
                    currentChat: chatData.chats[chatIdx - 1].name,
                  };
                });
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Append Selected Text"
            onAction={async () => {
              try {
                const selectedText = await getSelectedText();
                setSearchText((oldText) => oldText + selectedText);
              } catch {
                toast(Toast.Style.Failure, "Could not get the selected text");
              }
            }}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "v" }}
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
                      toast(Toast.Style.Failure, "Cannot delete only chat");
                      return;
                    }
                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        if (!oldData) return oldData;
                        const newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx, 1);
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
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const formatDate = (dateToCheckISO: string) => {
    const now = new Date();
    const dateToCheck = new Date(dateToCheckISO);
    if (dateToCheck.toDateString() === now.toDateString()) {
      return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    } else {
      return `${now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}`;
    }
  };

  const [chatData, setChatData] = useState<ChatData | null>(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem("chatData");
      if (storedChatData && typeof storedChatData === "string") {
        const newData = JSON.parse(storedChatData) as ChatData;

        // Check if there's an unfinished message and regenerate it
        const currentChat = getChat(newData.currentChat, newData.chats);
        if (currentChat?.messages[0]?.finished === false) {
          currentChat.messages[0].answer = "";
          toast(Toast.Style.Animated, "Regenerating Last Message");

          try {
            // Build messages array for better context handling
            const messages: ChatMessage[] = [];

            // Add previous messages in chronological order (skip the first one which is the current unfinished message)
            const previousMessages = currentChat.messages
              .slice(1) // Skip the current message (which has empty answer)
              .reverse(); // Get chronological order (oldest first)

            previousMessages.forEach((msg) => {
              if (msg.answer.trim()) {
                // Only add messages that have answers
                messages.push({ role: "user", content: msg.prompt });
                messages.push({ role: "assistant", content: msg.answer });
              }
            });

            // Add current user message
            messages.push({ role: "user", content: currentChat.messages[0].prompt });
            const result = await getResponse({
              prompt: messages,
              modelName: currentChat.model ?? defaultModel,
              apiKey: apiKey,
              apiBaseURL: apiBaseURL,
            });

            setChatData((oldData) => {
              if (!oldData) return oldData;
              const newChatData = structuredClone(oldData);
              const chat = getChat(newData.currentChat, newChatData.chats);
              if (chat && chat.messages[0]) {
                chat.messages[0].answer = result;
                chat.messages[0].finished = true;
              }
              return newChatData;
            });

            toast(Toast.Style.Success, "Response Loaded");
          } catch {
            setChatData((oldData) => {
              if (!oldData) return oldData;
              const newChatData = structuredClone(oldData);
              const chat = getChat(newData.currentChat, newChatData.chats);
              if (chat) {
                chat.messages.shift();
              }
              return newChatData;
            });
            toast(Toast.Style.Failure, "Fuelix cannot process this message.");
          }
        }

        setChatData(structuredClone(newData));
      } else {
        const newChatData: ChatData = {
          currentChat: "New Chat 1",
          chats: [
            {
              name: "New Chat 1",
              creationDate: new Date(),
              messages: [],
              model: defaultModel,
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
            name: `Quick AI at ${new Date().toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}`,
            creationDate: new Date(),
            messages: [
              {
                prompt: launchContext.query || "",
                answer: launchContext.response || "",
                creationDate: new Date().toISOString(),
                finished: true,
              },
            ],
            model: defaultModel,
          });
          newChatData.currentChat = `Quick AI at ${new Date().toLocaleString("en-US", {
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

  const getChat = (target: string, customChat = chatData?.chats) => {
    if (!customChat) return undefined;
    for (const chat of customChat) {
      if (chat.name === target) return chat;
    }
    return undefined;
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.Stars} title="Send a Message to Fuelix to get started." />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={
        getChat(chatData.currentChat)?.messages.length ? getChat(chatData.currentChat)!.messages.length > 0 : false
      }
      searchBarPlaceholder="Ask Fuelix..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newValue) => {
            setChatData((oldData) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                currentChat: newValue,
              };
            });
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
        if (!chat || !chat.messages.length) {
          return (
            <List.EmptyView
              icon={Icon.Stars}
              title="Send a Message to Fuelix to get started."
              actions={<FuelIXActionPanel />}
            />
          );
        }
        return chat.messages.map((x) => {
          return (
            <List.Item
              title={x.prompt}
              subtitle={formatDate(x.creationDate)}
              detail={<List.Item.Detail markdown={x.answer} />}
              key={x.prompt + x.creationDate}
              actions={<FuelIXActionPanel />}
            />
          );
        });
      })()}
    </List>
  );
}
