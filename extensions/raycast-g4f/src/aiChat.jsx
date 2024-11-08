import {
  Action,
  ActionPanel,
  Clipboard,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { Storage } from "./api/storage.js";
import { Preferences } from "./api/preferences.js";

import { watch } from "node:fs/promises";
import throttle from "lodash.throttle";

import { current_datetime, formatDate, removePrefix } from "./helpers/helper.js";
import { help_action, help_action_panel } from "./helpers/helpPage.jsx";
import { autoCheckForUpdates } from "./helpers/update.jsx";
import { plainTextMarkdown } from "./helpers/markdown.js";

import { MessagePair, format_chat_to_prompt, pairs_to_messages } from "./classes/message.js";

import { formatResponse, getChatResponse, getChatResponseSync } from "./api/gpt.jsx";
import * as providers from "./api/providers.js";
import { ChatProvidersReact } from "./api/providers_react.jsx";

import { getAIPresets, getPreset } from "./helpers/presets.jsx";

// Web search module
import { getFormattedWebResult, has_native_web_search, web_search_mode } from "./api/tools/web";
import { webSystemPrompt, systemResponse, webToken, webTokenEnd } from "./api/tools/web";

let generationStatus = { stop: false, loading: false, updateCurrentResponse: false };
let get_status = () => generationStatus.stop;

export default function Chat({ launchContext }) {
  const toast = async (style, title, message) => {
    return await showToast({
      style,
      title,
      message,
    });
  };

  /// The following utilities are used for managing chats.
  /// In v3.0, the chat system was rewritten so that we now only load chats from storage
  /// when they are needed. We maintain two main data structures: chatData and currentChatData.
  /// chatData contains all the chats (a lite version that only contains metadata), while
  /// currentChatData contains the full chat data for the currently selected chat.

  const storageKeyPrefix = "AIChat_";
  const getStorageKey = (chat_id) => {
    return `${storageKeyPrefix}${chat_id}`;
  };

  // add chat to chatData
  const addChat = (setChatData, chat) => {
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats.push(to_lite_chat_data(chat));
      return newChatData;
    });
  };

  // add chat to chatData and set it as the current chat
  const addChatAsCurrent = (setChatData, setCurrentChatData, chat) => {
    addChat(setChatData, chat);
    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.currentChat = chat.id;
      return newChatData;
    });
    setCurrentChatData(chat);
  };

  // delete chat from storage and chatData
  const deleteChat = async (setChatData, id) => {
    await Storage.delete(getStorageKey(id));

    let chatIdx = chatData.chats.findIndex((chat) => chat.id === id);
    if (chatIdx === -1) return;
    if (chatData.chats.length === 1) {
      await clear_chats_data(setChatData, setCurrentChatData);
      return;
    }

    if (chatIdx === chatData.chats.length - 1) {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData.chats.splice(chatIdx);
        if (id === newChatData.currentChat) {
          newChatData.currentChat = newChatData.chats[chatIdx - 1].id;
        }
        return newChatData;
      });
    } else {
      setChatData((oldData) => {
        let newChatData = structuredClone(oldData);
        newChatData.chats.splice(chatIdx, 1);
        if (id === newChatData.currentChat) {
          newChatData.currentChat = newChatData.chats[chatIdx].id;
        }
        return newChatData;
      });
    }

    await toast(Toast.Style.Success, "Chat deleted");
  };

  // update chat in storage
  const updateChat = async (chat, id = null) => {
    id = id ?? chat.id;
    await Storage.write(getStorageKey(id), JSON.stringify(chat));
  };

  // change a property of a data object.
  // if func is provided, it is applied to the object before setting the property
  const changeProperty = (setData, property, value, func = null) => {
    setData((oldData) => {
      let newData = structuredClone(oldData);
      if (!func) {
        newData[property] = value;
      } else {
        func(newData)[property] = value;
      }
      return newData;
    });
  };

  // get chat from storage
  const getChat = async (target) => {
    return JSON.parse(await Storage.read(getStorageKey(target), JSON.stringify(chat_data({}))));
  };

  // get chat from chatData (lite version)
  const getChatFromChatData = (target, data = chatData) => {
    for (const chat of data.chats) {
      if (chat.id === target) {
        return chat;
      }
    }
  };

  const getCurrentChatFromChatData = (data) => getChatFromChatData(data.currentChat, data);

  // the lite version of the chat, stored in chatData
  const to_lite_chat_data = (chat) => {
    return {
      name: chat.name,
      creationDate: chat.creationDate,
      id: chat.id,
    };
  };

  // clear chat data and set it to default
  const clear_chats_data = async (setChatData, setCurrentChatData) => {
    // first we clear all chats from storage; since we are deleting everything, we can do this first
    await pruneStoredChats([]);

    let newChat = chat_data({});
    setChatData({
      currentChat: newChat.id,
      chats: [],
    });
    await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
    setCurrentChatData(newChat);
  };

  const chat_data = ({
    name = "New Chat",
    creationDate = new Date(),
    id = Date.now().toString(), // toString() is important because Raycast expects a string for value
    provider = providers.default_provider_string(),
    systemPrompt = "",
    messages = [],
    options = { creativity: "0.7", webSearch: web_search_mode("chat") },
  }) => {
    return {
      name: name,
      creationDate: creationDate,
      id: id,
      provider: provider,
      systemPrompt: systemPrompt,
      messages: [...messages, ...starting_messages({ systemPrompt, provider, webSearch: options.webSearch })],
      options: options,
    };
  };

  const starting_messages = ({ systemPrompt = "", provider = null, webSearch = "off" } = {}) => {
    let messages = [];

    provider = provider instanceof Object ? provider : providers.get_provider_info(provider).provider;

    // Web Search system prompt
    if (webSearch === "always" || (webSearch === "auto" && !has_native_web_search(provider))) {
      systemPrompt += "\n\n" + webSystemPrompt;
    }

    if (systemPrompt) {
      messages.push(
        new MessagePair({
          prompt: systemPrompt,
          answer: systemResponse,
          visible: false,
        })
      );
    }
    return messages;
  };

  const updateStartingMessages = (chatData, options) => {
    const newMessages = starting_messages(options);

    while (chatData.messages.length > 0 && !chatData.messages[chatData.messages.length - 1].visible) {
      chatData.messages.pop();
    }
    chatData.messages.push(...newMessages);
  };

  const setCurrentChatMessage = (currentChatData, setCurrentChatData, messageID, { query, response, finished }) => {
    setCurrentChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      let messages = newChatData.messages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].id === messageID) {
          if (query !== undefined) messages[i].first.content = query;
          if (response !== undefined) messages[i].second.content = response;
          if (finished !== undefined) messages[i].finished = finished;
        }
      }
      return newChatData;
    });
  };

  const updateChatResponse = async (
    currentChatData,
    setCurrentChatData,
    messageID,
    query = null,
    features = { webSearch: true }
  ) => {
    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, { response: "" }); // set response to empty string

    const info = providers.get_provider_info(currentChatData.provider);

    const webSearchMode =
      currentChatData.options.webSearch === "auto"
        ? has_native_web_search(info.provider)
          ? "off"
          : "auto"
        : currentChatData.options.webSearch;

    let elapsed = 0.001,
      chars,
      charPerSec;
    let start = Date.now();
    let response = "";

    let loadingToast = await toast(Toast.Style.Animated, "Response loading");

    // Handle web search - if always enabled, we get the web search results
    if (webSearchMode === "always" && features.webSearch) {
      query = query ?? currentChatData.messages[0].first.content;
      await processWebSearchResponse(currentChatData, setCurrentChatData, messageID, null, query);
      return;
    }

    // Init other variables
    const devMode = Preferences["devMode"];

    if (!info.stream) {
      response = await getChatResponse(currentChatData, query);
      setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, { response: response });

      elapsed = (Date.now() - start) / 1000;
      chars = response.length;
      charPerSec = (chars / elapsed).toFixed(1);
    } else {
      generationStatus = { stop: false, loading: true, updateCurrentResponse: false };
      let i = 0;

      const _handler = async (new_message) => {
        i++;
        response = new_message;
        response = formatResponse(response, info.provider);
        setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, { response: response });

        if (generationStatus.updateCurrentResponse) {
          await _file_handler();
        }

        if (devMode && i % 1 === 0) {
          console.log(process.memoryUsage());
        }

        // Web Search functionality
        // We check the response every few chunks so we can possibly exit early
        if (
          webSearchMode === "auto" &&
          features.webSearch &&
          (i & 7) === 0 &&
          response.includes(webToken) &&
          response.includes(webTokenEnd)
        ) {
          generationStatus.stop = true; // stop generating the current response
          await processWebSearchResponse(currentChatData, setCurrentChatData, messageID, response, query);
          return;
        }

        elapsed = (Date.now() - start) / 1000;
        chars = response.length;
        charPerSec = (chars / elapsed).toFixed(1);
        loadingToast.message = `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`;
      };

      const _file_handler = throttle(async () => {
        await Storage.fileStorage_write("updateCurrentResponse", response);
      }, 300); // See ViewResponseComponent for more details

      const handler = throttle(_handler, 100);

      // Get response
      await getChatResponse(currentChatData, query, handler, get_status);

      await handler.flush();

      if (generationStatus.updateCurrentResponse) {
        await _file_handler.flush();
      }
    }

    // Web Search functionality
    // Process web search response again in case streaming is false, or if it was not processed during streaming
    // Prevent double processing by checking that generationStatus.stop is false
    if (webSearchMode === "auto" && features.webSearch && !generationStatus.stop && response.includes(webToken)) {
      generationStatus.stop = true;
      await processWebSearchResponse(currentChatData, setCurrentChatData, messageID, response, query);
      return;
    }

    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, { finished: true });

    await toast(
      Toast.Style.Success,
      "Response finished",
      `${chars} chars (${charPerSec} / sec) | ${elapsed.toFixed(1)} sec`
    );
    generationStatus = { stop: false, loading: false, updateCurrentResponse: false };

    // Smart Chat Naming functionality
    if (Preferences["smartChatNaming"] && currentChatData.messages.length <= 2) {
      await processSmartChatNaming(chatData, setChatData, currentChatData, setCurrentChatData);
    }

    // functions that run periodically
    await pruneChats(chatData, setChatData);
    await autoCheckForUpdates();
  };

  const pruneChatsInterval = 30 * 60 * 1000; // interval to prune inactive chats (in ms)

  const pruneChats = async (chatData, setChatData) => {
    const lastPruneTime = Number(await Storage.read("lastPruneChatsTime", 0));
    const currentTime = Date.now();
    if (currentTime - lastPruneTime < pruneChatsInterval) return;

    let pruneChatsLimit = Preferences["inactiveDuration"];
    pruneChatsLimit = Number(pruneChatsLimit) * 60 * 60 * 1000; // convert hours to ms
    if (pruneChatsLimit === 0) return;

    const keepChat = async (chat) => {
      if (chat.id === chatData.currentChat) return true;
      if (chat.pinned) return true;
      const fullChat = await getChat(chat.id);
      let lastMessageTime = fullChat.messages.length === 0 ? fullChat.creationDate : fullChat.messages[0].creationDate;
      lastMessageTime = new Date(lastMessageTime).getTime();
      return currentTime - lastMessageTime < pruneChatsLimit;
    };

    let chats = chatData.chats;
    let prunedCnt = 0;
    let prunedChats = {};

    for (const chat of chats) {
      let keep = await keepChat(chat);
      if (!keep) {
        prunedChats[chat.id] = true;
        prunedCnt++;
      }
    }

    setChatData((oldData) => {
      let newChatData = structuredClone(oldData);
      newChatData.chats = newChatData.chats.filter((chat) => !prunedChats[chat.id]);
      return newChatData;
    });

    for (const [id] of Object.entries(prunedChats)) {
      await Storage.delete(getStorageKey(id));
    }

    // Note that currentChat should never have been pruned, so we don't need to update it

    console.log(`Pruned ${prunedCnt} chats`);
    await Storage.write("lastPruneChatsTime", JSON.stringify(currentTime));
  };

  // prune stored chats. we loop through all stored chats and delete those that are not in chatData
  // since this is potentially risky (if chatData is corrupted), we do this extremely sparingly
  const pruneStoredChats = async (chats) => {
    let storedChats = await Storage.localStorage_list();
    let prunedCnt = 0;

    let chatIDs = chats.reduce((acc, chat) => {
      acc[chat.id] = true;
      return acc;
    }, {});
    for (const key of Object.keys(storedChats)) {
      if (key.startsWith(storageKeyPrefix) && !chatIDs[removePrefix(key, storageKeyPrefix)]) {
        await Storage.delete(key);
        prunedCnt++;
      }
    }

    console.log(`Pruned ${prunedCnt} stored chats`);
  };

  const exportChat = (chat) => {
    let str = "";
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      let message = chat.messages[i];
      let prompt = message.first.content,
        answer = message.second.content;
      let visible = message.visible ?? true,
        visibleToken = visible ? "" : "<|invisible_token|>";
      let time = new Date(message.creationDate).getTime();
      str += `<|start_message_token|>${visibleToken}${time}<|end_message_token|>\n`;
      if (prompt) {
        str += `<|start_prompt_token|>\n${prompt}\n<|end_prompt_token|>\n`;
      }
      if (answer) {
        str += `<|start_response_token|>\n${answer}\n<|end_response_token|>\n`;
      }
      str += "\n";
    }
    return str;
  };

  let ImportChatComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Import Chat"
              onSubmit={async (values) => {
                pop();
                await processImportChat(values.chatText, chatData, setChatData, values.provider);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="chatText" title="Chat Transcript" />
        <Form.Description title="Provider" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={providers.default_provider_string()}>
          {ChatProvidersReact}
        </Form.Dropdown>
      </Form>
    );
  };

  const processImportChat = async (str, chatData, setChatData, provider) => {
    let lines = str.split("\n");
    let messages = [];
    let currentMessage = null;
    let currentState = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.startsWith("<|start_message_token|>")) {
        if (currentMessage) {
          messages.unshift(currentMessage);
        }
        currentMessage = new MessagePair();

        if (line.includes("<|invisible_token|>")) {
          currentMessage.visible = false;
          line = line.replace("<|invisible_token|>", "");
        }

        let time = Number(line.replace("<|start_message_token|>", "").replace("<|end_message_token|>", ""));
        currentMessage.creationDate = new Date(time);
        currentMessage.id = time;
        currentMessage.finished = true;
      } else if (line.startsWith("<|start_prompt_token|>")) {
        currentState = "prompt";
      } else if (line.startsWith("<|end_prompt_token|>") || line.startsWith("<|end_response_token|>")) {
        currentState = null;
      } else if (line.startsWith("<|start_response_token|>")) {
        currentState = "response";
      } else {
        if (!currentMessage) continue; // this shouldn't happen unless chat transcript is malformed
        if (!line) line = "\n";
        if (currentState === "prompt") {
          currentMessage.first.content += line + "\n";
        } else if (currentState === "response") {
          currentMessage.second.content += line + "\n";
        }
      }
    }

    if (currentMessage) {
      messages.unshift(currentMessage);
    }

    let newChat = chat_data({
      name: `Imported at ${current_datetime()}`,
      provider: provider,
      messages: messages,
    });

    await addChatAsCurrent(setChatData, setCurrentChatData, newChat);

    await toast(Toast.Style.Success, "Chat imported");
  };

  let EditChatForm = (chat = null) => {
    return (
      <>
        <Form.Description
          title="Chat Name"
          text="In each chat, GPT will remember the previous messages you send in it."
        />
        <Form.TextField id="chatName" defaultValue={chat?.name ?? `New Chat ${current_datetime()}`} />

        <Form.Description title="AI Preset" text="The preset will override the options below." />
        <Form.Dropdown
          id="preset"
          defaultValue={chat !== null ? "" : AIPresets.find((preset) => preset.isDefault === true)?.name ?? ""}
        >
          {[
            <Form.Dropdown.Item title="" value="" key="" />,
            ...AIPresets.map((x) => <Form.Dropdown.Item title={x.name} key={x.name} value={x.name} />),
          ]}
        </Form.Dropdown>

        <Form.Description title="Provider" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={chat?.provider || providers.default_provider_string()}>
          {ChatProvidersReact}
        </Form.Dropdown>

        <Form.Description title="Web Search" text="Allow GPT to search the web for information." />
        <Form.Dropdown id="webSearch" defaultValue={chat?.options?.webSearch ?? web_search_mode("chat")}>
          <Form.Dropdown.Item title="Disabled" value="off" />
          <Form.Dropdown.Item title="Automatic" value="auto" />
          <Form.Dropdown.Item title="Always" value="always" />
        </Form.Dropdown>

        <Form.Description
          title="Creativity"
          text="Technical tasks like coding require less creativity, while open-ended ones require more."
        />
        <Form.Dropdown id="creativity" defaultValue={chat?.options?.creativity ?? "0.7"}>
          <Form.Dropdown.Item title="None" value="0.0" />
          <Form.Dropdown.Item title="Low" value="0.3" />
          <Form.Dropdown.Item title="Medium" value="0.5" />
          <Form.Dropdown.Item title="High" value="0.7" />
          <Form.Dropdown.Item title="Very High" value="1.0" />
        </Form.Dropdown>

        <Form.Description title="System Prompt" text="This prompt will be sent to GPT to start the conversation." />
        <Form.TextArea id="systemPrompt" defaultValue={chat?.systemPrompt ?? ""} />
      </>
    );
  };

  let CreateChatComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Create Chat"
              onSubmit={async (values) => {
                pop();

                if (values.preset) {
                  let preset = getPreset(AIPresets, values.preset);
                  values.provider = preset.provider;
                  values.webSearch = preset.webSearch;
                  values.creativity = preset.creativity;
                  values.systemPrompt = preset.systemPrompt;
                }

                let newChat = chat_data({
                  name: values.chatName,
                  provider: values.provider,
                  systemPrompt: values.systemPrompt,
                  options: { creativity: values.creativity, webSearch: values.webSearch },
                });

                await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
              }}
            />
          </ActionPanel>
        }
      >
        {EditChatForm()}
      </Form>
    );
  };

  let ViewResponseComponent = ({ idx, cb = null }) => {
    const { pop } = useNavigation();

    let initial = currentChatData.messages[idx].second.content;
    if (cb) initial = cb(initial); // cb is used to modify the response before displaying it
    const [response, setResponse] = useState(initial);

    // The key thing here is that this pushed view (via Action.Push) is a sibling component, NOT a child,
    // so it does not automatically rerender upon a value change. So when the response streams, the view doesn't update.
    // Since we can't control the parent component (that's managed by Raycast), we need to instead write changes
    // to a file and then read from there.
    // We only do this if View Response is active, which ensures that performance during normal usage is not impacted.

    if (!currentChatData.messages[idx].finished) {
      // don't stream if the response is finished
      useEffect(() => {
        (async () => {
          await Storage.fileStorage_write("updateCurrentResponse", "");
        })();
      }, []);

      generationStatus.updateCurrentResponse = true;

      const path = Storage.fileStoragePath("updateCurrentResponse");

      (async () => {
        const watcher = watch(path, { persistent: false });
        for await (const event of watcher) {
          if (event.eventType === "change") {
            let response = await Storage.fileStorage_read("updateCurrentResponse");
            if (cb) response = cb(response);
            setResponse(response);
          }
        }
      })();
    }

    return (
      <Detail
        markdown={response}
        actions={
          <ActionPanel>
            <Action title="Return to Chat" onAction={() => pop()} shortcut={{ modifiers: ["cmd"], key: "f" }} />
          </ActionPanel>
        }
      />
    );
  };

  let ComposeMessageComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Send to GPT"
              onSubmit={async (values) => {
                setSearchText("");
                pop();
                await sendToGPT(values);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea id="message" title="Message" defaultValue={searchText} />
        <Form.FilePicker title="Upload Files" id="files" />
      </Form>
    );
  };

  let EditMessageComponent = ({ idx }) => {
    if (currentChatData.messages.length === 0) {
      toast(Toast.Style.Failure, "No messages in chat");
      return;
    }

    const message = currentChatData.messages[idx].first.content;
    const files = currentChatData.messages[idx].files;

    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Edit Message"
              onSubmit={async (values) => {
                pop();
                await regenerateResponse(currentChatData, idx, values.message, values.files);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea title="Message" id="message" defaultValue={message} />
        <Form.FilePicker title="Upload Files" id="files" defaultValue={files} />
      </Form>
    );
  };

  let regenerateResponse = async (currentChatData, idx, newMessage = null, newFiles = null) => {
    if (newMessage) currentChatData.messages[idx].first.content = newMessage;
    if (newFiles) currentChatData.messages[idx].files = newFiles;

    currentChatData.messages[idx].second.content = "";
    currentChatData.messages[idx].finished = false;

    setCurrentChatData(currentChatData); // important to update the UI!

    let messageID = currentChatData.messages[idx].id;

    // instead of passing the full currentChatData, we only pass the messages
    // before, and including, the message we want to update. This is because chatCompletion takes
    // the last message as the query.
    let newChatData = structuredClone(currentChatData);

    // slice from the back, i.e. keep the messages [idx, end], since messages data is in reverse order
    newChatData.messages = currentChatData.messages.slice(idx);

    await updateChatResponse(newChatData, setCurrentChatData, messageID); // Note how we don't pass query here because it is already in the chat
  };

  let ChatSettingsComponent = () => {
    const { pop } = useNavigation();

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={(values) => {
                pop();

                if (values.preset) {
                  let preset = getPreset(AIPresets, values.preset);
                  values.provider = preset.provider;
                  values.creativity = preset.creativity;
                  values.systemPrompt = preset.systemPrompt;
                }

                // Limit chat name to 100 characters
                values.chatName = values.chatName.substring(0, 100);

                setCurrentChatData((oldData) => {
                  let newChatData = structuredClone(oldData);
                  newChatData.name = values.chatName;
                  changeProperty(setChatData, "name", values.chatName, getCurrentChatFromChatData);
                  newChatData.provider = values.provider;

                  // Update system prompt
                  if (
                    newChatData.systemPrompt !== values.systemPrompt ||
                    newChatData.options.webSearch !== values.webSearch
                  ) {
                    updateStartingMessages(newChatData, {
                      systemPrompt: values.systemPrompt,
                      provider: values.provider,
                      webSearch: values.webSearch,
                    });
                  }
                  newChatData.options = { creativity: values.creativity, webSearch: values.webSearch };
                  newChatData.systemPrompt = values.systemPrompt;

                  return newChatData;
                });

                toast(Toast.Style.Success, "Chat settings saved");
              }}
            />
          </ActionPanel>
        }
      >
        {EditChatForm(currentChatData)}
      </Form>
    );
  };

  // Web Search functionality
  const processWebSearchResponse = async (currentChatData, setCurrentChatData, messageID, response, query) => {
    setCurrentChatMessage(currentChatData, setCurrentChatData, messageID, { finished: false });

    let webQuery = response
      ? // get everything AFTER webToken and BEFORE webTokenEnd
        response.includes(webTokenEnd)
        ? response.substring(response.indexOf(webToken) + webToken.length, response.indexOf(webTokenEnd)).trim()
        : response.substring(response.indexOf(webToken) + webToken.length).trim()
      : query.substring(0, 400);
    let webResponse = await getFormattedWebResult(webQuery);

    // Append web search results to the last user message
    // special case: If e.g. the message was edited, query is not passed as a parameter, so it is null
    if (!query) query = currentChatData.messages[0].first.content;
    let newQuery = query + webResponse;

    // remove latest message and insert new one
    let newChatData = structuredClone(currentChatData);
    newChatData.messages.shift();
    newChatData.messages.unshift(new MessagePair({ prompt: newQuery }));
    let newMessageID = newChatData.messages[0].id;

    setCurrentChatData(newChatData); // important to update the UI!

    // Note how we don't pass query here because it is already in the chat
    await updateChatResponse(newChatData, setCurrentChatData, newMessageID, null, { webSearch: false });
  };

  // Smart Chat Naming functionality
  const processSmartChatNaming = async (chatData, setChatData, currentChatData, setCurrentChatData) => {
    try {
      // Special handling: don't include first message (system prompt)
      let newChat = structuredClone(currentChatData);
      if (!newChat.messages[newChat.messages.length - 1].visible) {
        newChat.messages.pop();
      }

      // Format chat using default wrapper
      let formatted_chat = format_chat_to_prompt(pairs_to_messages(newChat.messages));
      formatted_chat = formatted_chat.substring(0, 4000) + "..."; // limit to 4000 characters
      let newQuery =
        "Below is a conversation between the user and the assistant. Give a concise name for this chat. " +
        "Output ONLY the name of the chat (WITHOUT quotes) and NOTHING else.\n\n" +
        formatted_chat;

      let newChatName = await getChatResponseSync({
        messages: [new MessagePair({ prompt: newQuery })],
        provider: currentChatData.provider,
      });
      newChatName = newChatName.trim().substring(0, 80).replace(/\n/g, " ");

      // Rename chat
      if (newChatName) {
        changeProperty(setChatData, "name", newChatName, getCurrentChatFromChatData);
        changeProperty(setCurrentChatData, "name", newChatName);
      }
    } catch (e) {
      console.log("Smart Chat Naming failed: ", e);
    }
  };

  const sendToGPT = async (values = null) => {
    let query = searchText;
    if (values) {
      query = values.message;
    }
    let files = values?.files ?? [];

    if (query === "" && files.length === 0) {
      return;
    }

    setSearchText("");

    let newMessagePair = new MessagePair({ prompt: query, files: files });
    let newMessageID = newMessagePair.id;

    currentChatData.messages.unshift(newMessagePair);
    setCurrentChatData(currentChatData); // possibly redundant, put here for safety and consistency

    try {
      // Note how we don't pass query here because it is already in the chat
      await updateChatResponse(currentChatData, setCurrentChatData, newMessageID);
    } catch {
      await toast(Toast.Style.Failure, "An error occurred");
    }
  };

  let GPTActionPanel = ({ idx = 0 }) => {
    return (
      <ActionPanel>
        <Action
          icon={Icon.Message}
          title="Send to GPT"
          onAction={async () => {
            await sendToGPT();
          }}
        />
        <Action.Push icon={Icon.BlankDocument} title="Compose Message" target={<ComposeMessageComponent />} />
        <ActionPanel.Section title="Current Chat">
          {!generationStatus.stop && (
            <Action
              title="Stop Response"
              icon={Icon.Pause}
              onAction={() => {
                generationStatus.stop = true;
              }}
              shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "/" }}
            />
          )}
          <Action
            icon={Icon.Clipboard}
            title="Copy Response"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let response = currentChatData.messages[idx].second.content;
              await Clipboard.copy(response);
              await toast(Toast.Style.Success, "Response copied");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.Push
            icon={Icon.Maximize}
            title="View Response"
            target={<ViewResponseComponent idx={idx} />}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.Push
            icon={Icon.Maximize}
            title="View as Plain Text"
            target={<ViewResponseComponent idx={idx} cb={plainTextMarkdown} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Regenerate Response"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              if (currentChatData.messages[0].finished === false) {
                // We don't prevent the user from regenerating a message that is still loading,
                // because there are valid use cases, such as when the extension glitches, but we show an alert.
                let userConfirmed = false;
                await confirmAlert({
                  title: "Are you sure?",
                  message: "Response is still loading. Are you sure you want to regenerate it?",
                  icon: Icon.ArrowClockwise,
                  primaryAction: {
                    title: "Regenerate Response",
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

              await regenerateResponse(currentChatData, idx);
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action.Push
            icon={Icon.TextCursor}
            title="Edit Message"
            target={<EditMessageComponent idx={idx} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
          <Action
            icon={Icon.Trash}
            title="Delete Message"
            onAction={async () => {
              await confirmAlert({
                title: "Are you sure?",
                message: "You cannot recover deleted messages!",
                icon: Icon.Trash,
                primaryAction: {
                  title: "Delete Message",
                  style: Action.Style.Destructive,
                  onAction: () => {
                    if (currentChatData.messages.length === 0) {
                      toast(Toast.Style.Failure, "No messages to delete");
                      return;
                    }

                    // delete index idx
                    currentChatData.messages.splice(idx, 1);
                    setCurrentChatData((oldData) => {
                      let newChatData = structuredClone(oldData);
                      newChatData.messages = currentChatData.messages;
                      return newChatData;
                    });
                    toast(Toast.Style.Success, "Message deleted");
                  },
                },
              });
            }}
            shortcut={{ modifiers: ["shift"], key: "delete" }}
          />
          <Action
            icon={Icon.Tack}
            title="Pin Chat"
            onAction={async () => {
              setChatData((oldData) => {
                let newChatData = structuredClone(oldData);
                let chat = getCurrentChatFromChatData(newChatData);
                chat.pinned = !chat.pinned;

                toast(Toast.Style.Success, chat.pinned ? "Chat pinned" : "Chat unpinned");
                return newChatData;
              });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            icon={Icon.Gear}
            title="Chat Settings"
            target={<ChatSettingsComponent />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          <Action
            icon={Icon.Duplicate}
            title="Duplicate Chat"
            onAction={async () => {
              let newChat = structuredClone(currentChatData);
              newChat.id = Date.now().toString();
              newChat.name = `Copy of ${newChat.name}`;
              newChat.creationDate = new Date();
              await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
              await toast(Toast.Style.Success, "Chat duplicated");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          />
          <Action
            icon={Icon.Download}
            title="Export Chat"
            onAction={async () => {
              if (currentChatData.messages.length === 0) {
                await toast(Toast.Style.Failure, "No messages in chat");
                return;
              }

              let transcript = exportChat(currentChatData);
              await Clipboard.copy(transcript);
              await toast(Toast.Style.Success, "Chat transcript copied");
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Manage Chats">
          <Action.Push
            icon={Icon.PlusCircle}
            title="Create Chat"
            target={<CreateChatComponent />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            icon={Icon.PlusTopRightSquare}
            title="Quickly Create Chat"
            onAction={async () => {
              let newChat = chat_data({
                name: `New Chat ${current_datetime()}`,
              });
              await addChatAsCurrent(setChatData, setCurrentChatData, newChat);
              await toast(Toast.Style.Success, "Chat created");
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action
            icon={Icon.ArrowDown}
            title="Next Chat"
            onAction={() => {
              let chatIdx = chatData.chats.findIndex((chat) => chat.id === chatData.currentChat);
              if (chatIdx === chatData.chats.length - 1) toast(Toast.Style.Failure, "No chats after current");
              else {
                changeProperty(setChatData, "currentChat", chatData.chats[chatIdx + 1].id);
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          />
          <Action
            icon={Icon.ArrowUp}
            title="Previous Chat"
            onAction={() => {
              let chatIdx = chatData.chats.findIndex((chat) => chat.id === chatData.currentChat);
              if (chatIdx === 0) toast(Toast.Style.Failure, "No chats before current");
              else {
                changeProperty(setChatData, "currentChat", chatData.chats[chatIdx - 1].id);
              }
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          />
          <Action.Push icon={Icon.Upload} title="Import Chat" target={<ImportChatComponent />} />
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
                  onAction: async () => {
                    await deleteChat(setChatData, chatData.currentChat);
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
                        onAction: async () => {
                          await clear_chats_data(setChatData, setCurrentChatData);
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
        {help_action("aiChat")}
      </ActionPanel>
    );
  };

  let [chatData, setChatData] = useState(null);
  let [currentChatData, setCurrentChatData] = useState(null);
  let [AIPresets, setAIPresets] = useState([]);

  // Initialize the above variables
  useEffect(() => {
    (async () => {
      // initialise chatData
      const storedChatData = await Storage.read("chatData");
      if (storedChatData) {
        let newData = JSON.parse(storedChatData);
        setChatData(structuredClone(newData));
      } else {
        await clear_chats_data(setChatData, setCurrentChatData);
      }

      if (launchContext?.query) {
        let newChatName = `From Quick AI at ${current_datetime()}`;
        let newChat = chat_data({
          name: newChatName,
          messages: [
            new MessagePair({
              prompt: launchContext.query.text,
              answer: launchContext.response,
              finished: true,
              files: launchContext.query.files,
            }),
          ],
          provider: launchContext.provider,
        });
        addChatAsCurrent(setChatData, setCurrentChatData, newChat);
      }
    })();

    (async () => {
      const storedAIPresets = await getAIPresets();
      setAIPresets(storedAIPresets);
    })();
  }, []);

  useEffect(() => {
    if (chatData) {
      (async () => {
        await Storage.write("chatData", JSON.stringify(chatData));
      })();
    }
  }, [chatData]);

  useEffect(() => {
    if (currentChatData && chatData?.currentChat) {
      (async () => {
        await updateChat(currentChatData, chatData.currentChat);
      })();
    }
  }, [currentChatData]);

  useEffect(() => {
    if (chatData?.currentChat && currentChatData?.id !== chatData.currentChat) {
      (async () => {
        let chat = await getChat(chatData.currentChat);
        setCurrentChatData(chat);
      })();
    }
  }, [chatData?.currentChat]);

  const [searchText, setSearchText] = useState("");

  return chatData === null ? (
    <List searchText={searchText} onSearchTextChange={setSearchText}>
      <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." actions={help_action_panel("aiChat")} />
    </List>
  ) : (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={!isChatEmpty(currentChatData)}
      searchBarPlaceholder="Ask GPT..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Your Chats"
          onChange={(newChatID) => {
            changeProperty(setChatData, "currentChat", newChatID);
          }}
          value={chatData.currentChat}
        >
          {to_list_dropdown_items(chatData.chats)}
        </List.Dropdown>
      }
    >
      {(() => {
        if (isChatEmpty(currentChatData)) {
          return <List.EmptyView icon={Icon.SpeechBubble} title="Ask GPT Anything..." actions={<GPTActionPanel />} />;
        }
        return currentChatData.messages.map((x, i) => {
          if (x.visible)
            return (
              <List.Item
                title={x.first.content.substring(0, 50)} // limit to 50 characters
                subtitle={formatDate(x.creationDate)}
                detail={
                  <List.Item.Detail
                    markdown={x.second.content}
                    // show metadata if files were uploaded
                    metadata={
                      x.files && x.files.length > 0 ? (
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Files" />
                          {x.files.map((file, i) => (
                            <List.Item.Detail.Metadata.Label title="" text={file} key={i} />
                          ))}
                        </List.Item.Detail.Metadata>
                      ) : null
                    }
                  />
                }
                key={x.id}
                actions={<GPTActionPanel idx={i} />}
              />
            );
        });
      })()}
    </List>
  );
}

const isChatEmpty = (chat) => {
  if (!chat) return true;
  for (const message of chat.messages) {
    if (message.visible) return false;
  }
  return true;
};

const to_list_dropdown_items = (chats) => {
  let pinned = [],
    unpinned = [];
  for (const chat of chats) {
    if (chat.pinned) pinned.push(chat);
    else unpinned.push(chat);
  }
  return (
    <>
      <List.Dropdown.Section title="Pinned">
        {pinned.map((x) => {
          return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
        })}
      </List.Dropdown.Section>
      <>
        {unpinned.map((x) => {
          return <List.Dropdown.Item title={x.name} value={x.id} key={x.id} />;
        })}
      </>
    </>
  );
};
