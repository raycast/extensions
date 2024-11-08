import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import fetch from "node-fetch";

import { Storage } from "./api/storage.js";
import { formatDate, getSupportPath } from "./helpers/helper.js";
import { help_action } from "./helpers/helpPage.jsx";

import { provider, generate } from "g4f-image";

// Image Providers
const image_providers = {
  Prodia: {
    model: "prodia",
    data: {
      cfgScale: 20,
      samplingMethod: "DPM++ 2M Karras",
    },
  },
  ProdiaStableDiffusion: {
    model: "prodia-stablediffusion",
    data: {
      cfgScale: 20,
      samplingMethod: "DPM++ 2M Karras",
    },
  },
  DeepInfraFlux1Dev: {
    model: "black-forest-labs/FLUX-1-dev",
    data: {
      num_inference_steps: 25,
    },
  },
  DeepInfraFlux1Schnell: {
    model: "black-forest-labs/FLUX-1-schnell",
    data: {
      num_inference_steps: 25,
    },
  },
  StableDiffusionLite: {
    model: "stablediffusion-1.5",
  },
  StableDiffusionPlus: {
    model: "stablediffusion-2.1",
  },
  Dalle: {
    model: "dalle",
    data: {},
  },
  Rocks: {
    model: "rocks",
    data: {},
  },
};

const provider_map = {
  Prodia: provider.Nexra,
  ProdiaStableDiffusion: provider.Nexra,
  DeepInfraFlux1Dev: provider.DeepInfra,
  DeepInfraFlux1Schnell: provider.DeepInfra,
  StableDiffusionLite: provider.Nexra,
  StableDiffusionPlus: provider.Nexra,
  Dalle: provider.Nexra,
  Rocks: provider.Rocks,
};

// Default models for each provider
const default_models = {
  Prodia: "ICantBelieveItsNotPhotography_seco.safetensors [4e7a3dfd]",
  ProdiaStableDiffusion: "neverendingDream_v122.safetensors [f964ceeb]",
  Rocks: "flux",
};

const defaultImageProvider = "Prodia";

export default function genImage() {
  let toast = async (style, title, message) => {
    await showToast({
      style,
      title,
      message,
    });
  };

  let default_chat_data = () => {
    let newChat = {
      name: "New Image Chat",
      creationDate: new Date(),
      id: Date.now().toString(),
      provider: defaultImageProvider,
      imageQuality: "High",
      messages: [],
    };
    return {
      currentChat: newChat.id,
      chats: [newChat],
    };
  };

  const setCurrentChatData = (chatData, setChatData, messageID, prompt = null, answer = null, finished = null) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = getChat(chatData.currentChat, newChatData.chats).messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (prompt !== null) messages[i].prompt = prompt;
          if (answer !== null) messages[i].answer = answer;
          if (finished !== null) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  const updateCurrentChat = (chatData, setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      for (let i = 0; i < newChatData.chats.length; i++) {
        if (newChatData.chats[i].id === chat.id) {
          newChatData.chats[i] = chat;
          break;
        }
      }
      return newChatData;
    });
  };

  let generateImage = async (chatData, setChatData, query) => {
    let currentChat = getChat(chatData.currentChat);
    let messageID = Date.now();

    currentChat.messages.unshift({
      prompt: query,
      answer: "",
      creationDate: new Date().toISOString(),
      id: messageID,
      finished: false,
    });
    updateCurrentChat(chatData, setChatData, currentChat);

    try {
      const [provider, options] = loadImageOptions(currentChat);
      const base64Image = await generate(query, provider, options, { fetch: fetch });

      // save image
      let imagePath = "";

      // Each image chat has its own folder
      // Ensure the folder exists
      const folderPath = get_folder_path(chatData.currentChat);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const filePath = get_file_path(folderPath);

      imagePath = filePath;

      fs.writeFile(filePath, base64Image, "base64", (err) => {
        if (err) {
          toast(Toast.Style.Failure, "Error saving image");
          console.log("Error saving image. Current path: " + __dirname);
          console.log(err);
          imagePath = "";
        }
      });

      setCurrentChatData(chatData, setChatData, messageID, query, imagePath, true);
      console.log("Image saved to: " + imagePath);

      await toast(Toast.Style.Success, "Image generated");
    } catch (e) {
      console.log(e);
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        getChat(chatData.currentChat, newChatData.chats).messages.shift();
        return newChatData;
      });
      await toast(Toast.Style.Failure, "GPT cannot process this prompt");
    }
  };

  let CreateChat = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Image Chat"
              onSubmit={(values) => {
                pop();
                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  let newChat = {
                    name: values.chatName,
                    creationDate: new Date(),
                    id: Date.now().toString(),
                    provider: values.provider,
                    model: values.model.trim(),
                    imageQuality: values.imageQuality,
                    negativePrompt: values.negativePrompt,
                    messages: [],
                  };
                  newChatData.chats.push(newChat);
                  newChatData.currentChat = newChat.id;

                  return newChatData;
                });
              }}
            />
            {help_action("genImage")}
          </ActionPanel>
        }
      >
        <Form.Description title="Chat Name" text="Enter a chat name to help you organise your image chats." />
        <Form.TextField
          id="chatName"
          defaultValue={`New Image Chat ${new Date().toLocaleString("en-US", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}`}
        />
        <Form.Description title="Image Provider" text="The provider used for this Image Chat." />
        <Form.Dropdown id="provider" defaultValue="Prodia">
          <Form.Dropdown.Item title="Prodia" value="Prodia" />
          <Form.Dropdown.Item title="ProdiaStableDiffusion" value="ProdiaStableDiffusion" />
          <Form.Dropdown.Item title="DeepInfra FLUX.1 Dev" value="DeepInfraFlux1Dev" />
          <Form.Dropdown.Item title="DeepInfra FLUX.1 Schnell" value="DeepInfraFlux1Schnell" />
          <Form.Dropdown.Item title="StableDiffusionLite" value="StableDiffusionLite" />
          <Form.Dropdown.Item title="StableDiffusionPlus" value="StableDiffusionPlus" />
          <Form.Dropdown.Item title="DALL-E" value="Dalle" />
          <Form.Dropdown.Item title="Rocks" value="Rocks" />
        </Form.Dropdown>

        <Form.Description
          title="Image Model"
          text="The model used for this Image Chat. Leave as 'default' to use the default model. Select 'Help' for the list of available models."
        />
        <Form.TextField id="model" defaultValue="default" />

        <Form.Description title="Image Quality" text="Higher quality images need more time to generate." />
        <Form.Dropdown id="imageQuality" defaultValue="High">
          <Form.Dropdown.Item title="Medium" value="Medium" />
          <Form.Dropdown.Item title="High" value="High" />
          <Form.Dropdown.Item title="Extreme" value="Extreme" />
        </Form.Dropdown>

        <Form.Description title="Negative Prompt" text="Words that you don't want to show up in your images." />
        <Form.TextArea id="negativePrompt" defaultValue="" />
      </Form>
    );
  };

  let RenameImageChat = () => {
    let chat = getChat(chatData.currentChat);

    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Rename Image Chat"
              onSubmit={(values) => {
                pop();

                setChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  getChat(chatData.currentChat, newChatData.chats).name = values.chatName;
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

  let ImageActionPanel = (props) => {
    const idx = props.idx ?? 0;

    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Generate Image"
          onAction={async () => {
            if (searchText === "") {
              return;
            }

            const query = searchText;
            setSearchText("");
            await toast(Toast.Style.Animated, "Image loading", "Please wait");

            await generateImage(chatData, setChatData, query);
          }}
        />
        <ActionPanel.Section title="Current Image Chat">
          <Action
            icon={Icon.Folder}
            title="Show in Finder"
            onAction={async () => {
              const messages = getChat(chatData.currentChat).messages;
              const message = messages[idx];
              const path = message.answer;
              try {
                await showInFinder(path);
              } catch (e) {
                await toast(Toast.Style.Failure, "Image not found");
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action
            icon={Icon.Clipboard}
            title="Copy Image Path"
            onAction={async () => {
              const messages = getChat(chatData.currentChat).messages;
              const message = messages[idx];
              const path = message.answer;
              await Clipboard.copy(path);
              await toast(Toast.Style.Success, "Image path copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Image"
            onAction={async () => {
              let chat = getChat(chatData.currentChat);

              if (chat.messages.length === 0) {
                await toast(Toast.Style.Failure, "No images in chat");
                return;
              }

              if (chat.messages[0].finished === false) {
                let userConfirmed = false;
                await confirmAlert({
                  title: "Are you sure?",
                  message: "Image is still loading. Are you sure you want to regenerate it?",
                  icon: Icon.ArrowClockwise,
                  primaryAction: {
                    title: "Regenerate Image",
                    onAction: () => {
                      userConfirmed = true;
                    },
                  },
                  dismissAction: {
                    title: "Cancel",
                  },
                });
                if (!userConfirmed) {
                  return;
                }
              }

              const query = chat.messages[idx].prompt;

              // delete current message
              chat.messages.splice(idx, 1);

              // generate new image
              await toast(Toast.Style.Animated, "Image loading", "Please wait");
              await generateImage(chatData, setChatData, query);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Image"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted images!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Image",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    let chat = getChat(chatData.currentChat);

                    if (chat.messages.length === 0) {
                      toast(Toast.Style.Failure, "No images in chat");
                      return;
                    }

                    // delete image file
                    const imagePath = chat.messages[idx].answer;
                    try {
                      fs.rmSync(imagePath);
                    } catch (e) {} // eslint-disable-line

                    // delete index idx
                    chat.messages.splice(idx, 1);
                    setChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      getChat(chatData.currentChat, newChatData.chats).messages = chat.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Image deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
          <Action.Push
            icon={Icon.Pencil}
            title="Rename Chat"
            target={<RenameImageChat />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Manage Image Chats">
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Image Chat"
            target={<CreateChat />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.ArrowDown}
            title="Next Image Chat"
            onAction={() => {
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].id === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No chats after current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
                  currentChat: chatData.chats[chatIdx + 1].id,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <Action
            icon={Icon.ArrowUp}
            title="Previous Image Chat"
            onAction={() => {
              let chatIdx = 0;
              for (let i = 0; i < chatData.chats.length; i++) {
                if (chatData.chats[i].id === chatData.currentChat) {
                  chatIdx = i;
                  break;
                }
              }
              if (chatIdx === 0) toast(Toast.Style.Failure, "No chats before current");
              else {
                setChatData((oldData) => ({
                  ...oldData,
                  currentChat: chatData.chats[chatIdx - 1].id,
                }));
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Danger zone">
          <Action
            icon={Icon.Trash}
            title="Delete Image Chat"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover this chat.",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Image Chat Forever",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    let chatIdx = 0;
                    for (let i = 0; i < chatData.chats.length; i++) {
                      if (chatData.chats[i].id === chatData.currentChat) {
                        chatIdx = i;
                        break;
                      }
                    }

                    // Delete the image chat folder
                    const folderPath = get_folder_path(chatData.currentChat);
                    try {
                      fs.rm(folderPath, { recursive: true }, () => {
                        return null;
                      });
                    } catch (e) {} // eslint-disable-line

                    if (chatData.chats.length === 1) {
                      setChatData(default_chat_data());
                      return;
                    }

                    if (chatIdx === chatData.chats.length - 1) {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx);
                        newChatData.currentChat = newChatData.chats[chatIdx - 1].id;
                        return newChatData;
                      });
                    } else {
                      setChatData((oldData) => {
                        let newChatData = structuredClone(oldData);
                        newChatData.chats.splice(chatIdx, 1);
                        newChatData.currentChat = newChatData.chats[chatIdx].id;
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
            title="Delete All Image Chats"
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
                          // Delete all image chat folders
                          const folderPath = getSupportPath() + "/g4f-image-chats";
                          fs.rm(folderPath, { recursive: true }, () => {
                            return null;
                          });
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
        {help_action("genImage")}
      </ActionPanel>
    );
  };

  let [chatData, setChatData] = useState(null);

  useEffect(() => {
    (async () => {
      const storedChatData = await Storage.read("imageChatData");

      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        const newChatData = default_chat_data();
        await Storage.write("imageChatData", JSON.stringify(newChatData));
        // Delete all image chat folders
        const folderPath = getSupportPath() + "/g4f-image-chats";
        fs.rm(folderPath, { recursive: true }, () => {
          return null;
        });
        setChatData(newChatData);
      }
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await Storage.write("imageChatData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  const [searchText, setSearchText] = useState("");

  let getChat = (target, customChat = chatData.chats) => {
    for (const chat of customChat) {
      if (chat.id === target) return chat;
    }
  };

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.Stars} title="Imagine Anything..." />
    </List>
  ) : (
    <List
      isShowingDetail={!isChatEmpty(getChat(chatData.currentChat))}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Generate image..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Image Chats"
          onChange={(newValue) => {
            setChatData((oldData) => ({
              ...oldData,
              currentChat: newValue,
            }));
          }}
          value={chatData.currentChat}
        >
          {chatData.chats.map((x) => {
            return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
          })}
        </List.Dropdown>
      }
    >
      {(() => {
        let chat = getChat(chatData.currentChat);
        if (!chat.messages.length) {
          return <List.EmptyView icon={Icon.Stars} title="Imagine Anything..." actions={<ImageActionPanel />} />;
        }
        return chat.messages.map((x, i) => {
          return (
            <List.Item
              title={x.prompt}
              subtitle={formatDate(x.creationDate)}
              key={i}
              detail={<List.Item.Detail markdown={image_to_markdown(x.answer)} />}
              actions={<ImageActionPanel idx={i} />}
            />
          );
        });
      })()}
    </List>
  );
}

// load provider and options
const loadImageOptions = (currentChat) => {
  const providerString = currentChat.provider,
    modelString = currentChat.model,
    imageQuality = currentChat.imageQuality,
    negativePrompt = currentChat.negativePrompt;
  let provider = provider_map[providerString] ?? provider.Nexra;
  let options = image_providers[providerString];
  let data = options.data;

  let model = !modelString || modelString === "default" ? default_models[providerString] : modelString;
  if (model) {
    options.model = model;
    data = { ...data, model: model };
  }

  // image quality and creativity settings are handled separately
  // only initialise samplingSteps if supported by the provider
  if (providerString === "Prodia") {
    data.samplingSteps = imageQuality === "Medium" ? 10 : imageQuality === "High" ? 15 : 20;
  } else if (providerString === "ProdiaStableDiffusion") {
    data.samplingSteps = imageQuality === "Medium" ? 20 : imageQuality === "High" ? 25 : 30;
  } else if (providerString === "DeepInfraFlux1Dev" || providerString === "DeepInfraFlux1Schnell") {
    data.num_inference_steps = imageQuality === "Medium" ? 25 : imageQuality === "High" ? 40 : 80;
  }

  if (negativePrompt) data.negativePrompt = negativePrompt;

  options.data = data;

  return [provider, options];
};

const get_folder_path = (chatId) => {
  return getSupportPath() + "/g4f-image-chats/" + chatId.toString();
};

const get_file_path = (folderPath) => {
  return (
    folderPath + "/g4f-image_" + encodeURIComponent(new Date().toISOString().replace(/:/g, "-").split(".")[0] + ".png")
  );
};

const isChatEmpty = (chat) => {
  for (const message of chat.messages) {
    if (message.prompt || message.answer) return false;
  }
  return true;
};

const image_to_markdown = (answer) => {
  if (!answer) return "";
  return `![Image](${encodeURI(answer)}?raycast-height=350)`;
};
