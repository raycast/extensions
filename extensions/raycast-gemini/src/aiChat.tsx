import {
  Action,
  ActionPanel,
  confirmAlert,
  Form,
  getPreferenceValues,
  getSelectedText,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  Alert,
} from "@raycast/api";
import { GoogleGenAI } from "@google/genai";
import { useEffect, useState } from "react";
import { getSafetySettings } from "./api/safetySettings";

interface ChatMessage {
  prompt: string;
  answer: string;
  creationDate: string;
  finished: boolean;
}

interface ChatEntry {
  name: string;
  creationDate: Date | string;
  messages: ChatMessage[];
  model?: string;
}

interface ChatData {
  currentChat: string;
  chats: ChatEntry[];
}

interface ChatLaunchContext {
  query?: string;
  response?: string;
  creationName?: string;
}

export default function Chat({ launchContext }: LaunchProps<{ launchContext: ChatLaunchContext }>) {
  const toast = async (style: Toast.Style, title: string, message?: string) => {
    await showToast({
      style,
      title,
      message,
    });
  };

  function showFailureToast(error: unknown, options: { title?: string; primaryAction?: Toast.ActionOptions } = {}) {
    return showToast({
      style: Toast.Style.Failure,
      title: options.title || "Error",
      message: error instanceof Error ? error.message : String(error),
      primaryAction: options.primaryAction,
    });
  }

  const { apiKey, defaultModel } = getPreferenceValues<Preferences.AiChat>();
  const genAI = new GoogleGenAI({ apiKey });
  const createNewChatName = (prefix = "New Chat ") => {
    const existingChatNames = chatData!.chats.map((x) => x.name);
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
              onSubmit={(values: { chatName: string; model: string }) => {
                const newName = values.chatName.trim() || createNewChatName();
                if (chatData!.chats.map((x) => x.name).includes(newName)) {
                  showFailureToast("Chat with that name already exists.");
                } else {
                  pop();
                  setChatData((oldData) => {
                    const newChatData = structuredClone(oldData!);
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
          text="In each chat, Gemini will remember the previous messages you send in it."
        />
        <Form.TextField id="chatName" />
        <Form.Description
          title="Chat Model"
          text="The model used for this chat. Setting this to Default will use the model you set as Default for the extension in Preferences."
        />
        <Form.Dropdown id="model" defaultValue="default">
          <Form.Dropdown.Item title="Default" value="default" />
          <Form.Dropdown.Item title="Gemini 2.5 Flash-Lite" value="gemini-2.5-flash-lite" />
          <Form.Dropdown.Item title="Gemini 2.5 Flash" value="gemini-2.5-flash" />
          <Form.Dropdown.Item title="Gemini 2.5 Pro" value="gemini-2.5-pro" />
          <Form.Dropdown.Item title="Gemini 3.0 Flash" value="gemini-3-flash-preview" />
          <Form.Dropdown.Item title="Gemini 3.1 Pro" value="gemini-3.1-pro-preview" />
        </Form.Dropdown>
      </Form>
    );
  };

  const GeminiActionPanel = ({ idx }: { idx?: number } = {}) => {
    const currentChatObj = chatData ? getChat(chatData.currentChat) : null;
    const message =
      currentChatObj && typeof idx === "number" && currentChatObj.messages && currentChatObj.messages[idx]
        ? currentChatObj.messages[idx]
        : null;

    const fullChatText =
      currentChatObj && currentChatObj.messages?.length
        ? currentChatObj.messages
            .slice()
            .map((m) => {
              const p = (m?.prompt ?? "").trim();
              const a = (m?.answer ?? "").trim();
              const d = m?.creationDate ? `(${formatDate(m.creationDate)}) ` : "";
              return `${d}USER:\n${p}\n\nMODEL:\n${a}`.trim();
            })
            .join("\n\n---\n\n")
        : "";

    return (
      <ActionPanel>
        {message && (
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Answer" content={message.answer ?? ""} />
            <Action.CopyToClipboard
              title="Copy Prompt"
              content={message.prompt ?? ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        )}

        {fullChatText && (
          <ActionPanel.Section title="Export">
            <Action.CopyToClipboard
              title="Copy Entire Chat (Transcript)"
              content={fullChatText}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          </ActionPanel.Section>
        )}
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
            const currentChatObj = getChat(chatData!.currentChat)!;
            if (currentChatObj.messages.length == 0 || currentChatObj.messages[0].finished) {
              toast(Toast.Style.Animated, "Response Loading", "Please Wait");
              setChatData((x) => {
                const newChatData = structuredClone(x!);
                const currentChat = getChat(chatData!.currentChat, newChatData.chats)!;

                currentChat.messages.unshift({
                  prompt: query,
                  answer: "",
                  creationDate: new Date().toISOString(),
                  finished: false,
                });
                return newChatData;
              });

              (async () => {
                try {
                  const historyMessages = currentChatObj.messages
                    .slice(1)
                    .reverse()
                    .filter((msg) => msg.prompt && msg.prompt.trim() && msg.answer && msg.answer.trim())
                    .map((msg) => [
                      { role: "user" as const, parts: [{ text: msg.prompt }] },
                      { role: "model" as const, parts: [{ text: msg.answer }] },
                    ])
                    .flat();

                  const modelName = currentChatObj.model ?? defaultModel;
                  const chatSession = genAI.chats.create({
                    model: modelName,
                    config: {
                      safetySettings: getSafetySettings(),
                    },
                    history: historyMessages,
                  });

                  const result = await chatSession.sendMessageStream({
                    message: query,
                  });

                  for await (const chunk of result) {
                    const chunkText = chunk.text;
                    if (chunkText) {
                      setChatData((oldData) => {
                        const newChatData = structuredClone(oldData!);
                        const chatToUpdate = getChat(chatData!.currentChat, newChatData.chats);
                        if (chatToUpdate && chatToUpdate.messages[0]) {
                          chatToUpdate.messages[0].answer += chunkText;
                        }
                        return newChatData;
                      });
                    }
                  }

                  setChatData((oldData) => {
                    const newChatData = structuredClone(oldData!);
                    getChat(chatData!.currentChat, newChatData.chats)!.messages[0].finished = true;
                    return newChatData;
                  });

                  toast(Toast.Style.Success, "Response Loaded");
                } catch (e: unknown) {
                  setChatData((oldData) => {
                    const newChatData = structuredClone(oldData!);
                    getChat(chatData!.currentChat, newChatData.chats)!.messages.shift();
                    return newChatData;
                  });
                  console.error(e);
                  const message = e instanceof Error ? e.message : String(e);
                  if (message.includes("429")) {
                    toast(Toast.Style.Failure, "You have been rate-limited.", "Please slow down.");
                  } else {
                    toast(Toast.Style.Failure, "Gemini cannot process this message.", message);
                  }
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
              let chatIdx = 0;
              for (let i = 0; i < chatData!.chats.length; i++) {
                if (chatData!.chats[i].name === chatData!.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData!.chats.length - 1) toast(Toast.Style.Failure, "No Chats After Current");
              else {
                setChatData((oldData) => ({
                  ...oldData!,
                  currentChat: chatData!.chats[chatIdx + 1].name,
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
              for (let i = 0; i < chatData!.chats.length; i++) {
                if (chatData!.chats[i].name === chatData!.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === 0) toast(Toast.Style.Failure, "No Chats Before Current");
              else {
                setChatData((oldData) => ({
                  ...oldData!,
                  currentChat: chatData!.chats[chatIdx - 1].name,
                }));
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
                  style: Alert.ActionStyle.Destructive,
                  onAction: () => {
                    let chatIdx = 0;
                    for (let i = 0; i < chatData!.chats.length; i++) {
                      if (chatData!.chats[i].name === chatData!.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }
                    if (chatData!.chats.length === 1) {
                      toast(Toast.Style.Failure, "Cannot delete only chat");
                      return;
                    }
                    if (chatIdx === chatData!.chats.length - 1) {
                      setChatData((oldData) => {
                        const newChatData = structuredClone(oldData!);
                        newChatData.chats.splice(chatIdx);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].name;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        const newChatData = structuredClone(oldData!);
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

  const formatDate = (dateToCheckISO: string) => {
    const dateToCheck = new Date(dateToCheckISO);
    if (dateToCheck.toDateString() === new Date().toDateString()) {
      return `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    } else {
      return `${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })}`;
    }
  };

  const [chatData, setChatData] = useState<ChatData | null>(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await LocalStorage.getItem<string>("chatData");
      if (storedChatData) {
        const newData: ChatData = JSON.parse(storedChatData);

        if (getChat(newData.currentChat, newData.chats)?.messages[0]?.finished === false) {
          const currentChat = getChat(newData.currentChat, newData.chats)!;
          const historyMessages = currentChat.messages
            .slice(1)
            .reverse()
            .filter((msg) => msg.prompt && msg.prompt.trim() && msg.answer && msg.answer.trim())
            .map((msg) => [
              { role: "user" as const, parts: [{ text: msg.prompt }] },
              { role: "model" as const, parts: [{ text: msg.answer }] },
            ])
            .flat();

          const chatSession = genAI.chats.create({
            model: currentChat.model ?? defaultModel,
            config: {
              safetySettings: getSafetySettings(),
            },
            history: historyMessages,
          });
          currentChat.messages[0].answer = "";
          const promptToRegen = currentChat.messages[0].prompt;
          toast(Toast.Style.Animated, "Regenerating Last Message");
          (async () => {
            try {
              const result = await chatSession.sendMessageStream({
                message: promptToRegen,
              });

              for await (const chunk of result) {
                const chunkText = chunk.text;
                if (chunkText) {
                  setChatData((oldData) => {
                    const newChatData = structuredClone(oldData!);
                    const chat = getChat(newData.currentChat, newChatData.chats);
                    if (chat && chat.messages[0]) {
                      chat.messages[0].answer += chunkText;
                    }
                    return newChatData;
                  });
                }
              }

              setChatData((oldData) => {
                const newChatData = structuredClone(oldData!);
                getChat(newData.currentChat, newChatData.chats)!.messages[0].finished = true;
                return newChatData;
              });

              toast(Toast.Style.Success, "Response Loaded");
            } catch (e: unknown) {
              setChatData((oldData) => {
                const newChatData = structuredClone(oldData!);
                getChat(newData.currentChat, newChatData.chats)!.messages.shift();
                return newChatData;
              });
              const message = e instanceof Error ? e.message : String(e);
              toast(Toast.Style.Failure, "Gemini cannot process this message.", message);
            }
          })();
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
          const newChatData = structuredClone(oldData!);
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
                prompt: launchContext.query!,
                answer: launchContext.response ?? "",
                creationDate: new Date().toISOString(),
                finished: true,
              },
            ],
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

  const getChat = (target: string, customChat: ChatEntry[] = chatData?.chats ?? []): ChatEntry | null => {
    for (const chat of customChat) {
      if (chat.name === target) return chat;
    }
    return null;
  };

  if (chatData === null) {
    return (
      <List searchText={searchText} onSearchTextChange={setSearchText}>
        <List.EmptyView icon={Icon.Stars} title="Loading Chat..." />
      </List>
    );
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={getChat(chatData.currentChat)!.messages.length > 0}
      searchBarPlaceholder="Ask Gemini..."
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
        if (!chat || !chat.messages.length) {
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
              detail={<List.Item.Detail markdown={x.answer || ""} />}
              key={x.prompt + x.creationDate}
              actions={<GeminiActionPanel idx={i} />}
            />
          );
        });
      })()}
    </List>
  );
}
