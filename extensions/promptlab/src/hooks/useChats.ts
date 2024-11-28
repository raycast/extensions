import * as fs from "fs";
import path from "path";

import { environment, Icon, Color, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { ChatManager, Chat, ChatStatistics } from "../lib/chats/types";
import { ADVANCED_SETTINGS_FILENAME } from "../lib/common/constants";
import { installDefaults } from "../lib/files/file-utils";
import { ExtensionPreferences } from "../lib/preferences/types";

export function useChats(): ChatManager {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  const supportPath = environment.supportPath;
  const chatsDir = `${supportPath}/chats`;

  useEffect(() => {
    // Create the chats directory if it doesn't exist
    if (!fs.existsSync(chatsDir)) {
      fs.mkdirSync(chatsDir);
    }
  }, []);

  const createChat = async (name: string, basePrompt: string, options: object, fileExistsAlready = false) => {
    if (chats.find((chat) => chat.name === name)) {
      setError("A chat with that name already exists.");
      return;
    }

    const chatFile = `${chatsDir}/${name}.txt`;
    if (!fileExistsAlready) {
      fs.writeFileSync(chatFile, "");
    }

    let newChat: Chat = {
      name: name,
      icon: Icon.Message,
      iconColor: Color.Red,
      basePrompt: basePrompt,
      favorited: false,
      contextData: [],
      condensingStrategy: "summarize",
      summaryLength: "100",
      showBasePrompt: true,
      useSelectedFilesContext: false,
      useConversationContext: true,
      allowAutonomy: false,
      ...options,
    };

    try {
      const advancedSettingsValues = JSON.parse(
        fs.readFileSync(path.join(environment.supportPath, ADVANCED_SETTINGS_FILENAME), "utf-8"),
      );
      if ("chatDefaults" in advancedSettingsValues) {
        newChat = { ...advancedSettingsValues.chatDefaults, name: name, basePrompt: basePrompt, contextData: [] };
      }
    } catch (error) {
      console.error(error);
    }

    await LocalStorage.setItem(`--chat-${name}`, JSON.stringify(newChat));
    return newChat;
  };

  const loadChats = async () => {
    // Get the chat settings
    setIsLoading(true);

    // Load chats from local storage
    const localItems = await LocalStorage.allItems();
    const chatObjs = Object.entries(localItems)
      .filter(([key]) => key.startsWith("--chat-"))
      .map(([, value]) => JSON.parse(value));

    // Load chats from the chats directory
    const preferences = getPreferenceValues<{ basePrompt: string }>();
    const chatFiles = fs.readdirSync(chatsDir);
    for (const chatFile of chatFiles) {
      const chatName = chatFile.replace(".txt", "");
      if (chatName.length == 0 || chatName.startsWith(".")) continue;
      if (chatObjs.find((chat) => chat.name === chatName)) continue;
      const chat = await createChat(chatName, preferences.basePrompt, {}, true);
      if (chat) {
        chatObjs.push(chat);
      }
    }

    setChats(chatObjs);
    setIsLoading(false);
  };

  useEffect(() => {
    Promise.resolve(installDefaults()).then(() => {
      Promise.resolve(loadChats());
    });
  }, []);

  const revalidate = async () => {
    return loadChats();
  };

  const favorites = () => {
    return chats.filter((chat) => chat.favorited);
  };

  const appendToChat = async (chat: Chat, text: string) => {
    const chatFile = `${chatsDir}/${chat.name}.txt`;
    fs.appendFileSync(chatFile, `${text}\n`);
  };

  const setChatProperty = async (chat: Chat, property: string, value: string | boolean) => {
    const newChat = { ...chat, [property]: value };
    await LocalStorage.setItem(`--chat-${chat.name}`, JSON.stringify(newChat));
  };

  const checkExists = (chat: Chat) => {
    if (!chats.find((c) => c.name === chat.name)) {
      return false;
    }

    if (!fs.existsSync(`${chatsDir}/${chat.name}.txt`)) {
      return false;
    }
    return true;
  };

  const getChatContents = (chat: Chat) => {
    const chatFile = `${chatsDir}/${chat.name}.txt`;
    if (!fs.existsSync(chatFile)) {
      return "";
    }
    return fs.readFileSync(chatFile, "utf8");
  };

  const loadConversation = (chatName: string) => {
    if (!chats.find((c) => c.name === chatName)) {
      setError("A chat with that name does not exist.");
      return;
    }

    const preferences = getPreferenceValues<ExtensionPreferences>();
    const chatFile = `${chatsDir}/${chatName}.txt`;
    const convo: string[] = [];

    if (!fs.existsSync(chatFile)) {
      return convo;
    }

    const chatContents = fs.readFileSync(chatFile, "utf8");
    const entries = chatContents.split(/\[(?=USER_QUERY|MODEL_RESPONSE\]:)/g);
    entries.forEach((entry) => {
      convo.push(entry.replace("]", "").trim());
    });

    while (convo.join("\n").length > parseInt(preferences.lengthLimit) + 1000) {
      convo.shift();
    }

    return convo;
  };

  const calculateStats = (chatName: string): ChatStatistics => {
    const convo = loadConversation(chatName);

    const stats: ChatStatistics = {
      totalQueries: "0",
      totalResponses: "0",
      totalPlaceholdersUsedByUser: "0",
      totalCommandsRunByAI: "0",
      mostCommonQueryWords: [],
      mostCommonResponseWords: [],
      totalLengthOfContextData: "0",
      lengthOfBasePrompt: "0",
      averageQueryLength: "0",
      averageResponseLength: "0",
      mostUsedPlaceholder: "None",
      mostUsedCommand: "None",
      mostUsedEmojis: [],
    };

    const chat = chats.find((c) => c.name === chatName);
    if (!chat) {
      return stats;
    }

    stats.lengthOfBasePrompt = `${chat.basePrompt.length} characters`;

    if (convo) {
      const queries = convo.filter((entry) => entry.startsWith("USER_QUERY")).map((entry) => entry.substring(11));
      const responses = convo.filter((entry) => entry.startsWith("MODEL_RESPONSE")).map((entry) => entry.substring(15));
      const placeholders = queries.filter((entry) => entry.match(/.*{{.*}}.*/g) != undefined);
      const commands = responses.filter((entry) => entry.match(/.*{{cmd:.*}}.*/g) != undefined);
      const emojis = responses
        .map((entry) => entry.match(/(\p{Extended_Pictographic}){1}/gu) || "")
        .flat()
        .filter((entry) => entry.trim().length > 0);

      stats.totalQueries = `${queries.length} queries`;
      stats.totalResponses = `${responses.length} responses`;
      stats.totalPlaceholdersUsedByUser = `${placeholders.length} placeholders`;
      stats.totalCommandsRunByAI = `${commands.length} commands`;

      stats.averageQueryLength = `${queries.reduce((acc, cv) => acc + cv.length, 0) / queries.length} characters`;
      stats.averageResponseLength = `${
        responses.reduce((acc, cv) => acc + cv.length, 0) / responses.length
      } characters`;

      const queryWords = queries
        .map((query) => query.split(" "))
        .flat()
        .map((entry) => entry.trim());
      const responseWords = responses.map((response) => response.split(" ")).flat();

      const getFrequencyHistogram = (arr: string[]) => {
        const freqs: { [key: string]: number } = {};
        arr.forEach((word) => {
          if (freqs[word]) {
            freqs[word] += 1;
          } else {
            freqs[word] = 1;
          }
        });
        return freqs;
      };

      const queryWordCounts = getFrequencyHistogram(queryWords);
      const responseWordCounts = getFrequencyHistogram(responseWords);
      const placeholderCounts = getFrequencyHistogram(placeholders);
      const commandCounts = getFrequencyHistogram(commands);
      const emojiCounts = getFrequencyHistogram(emojis);

      const queryWordsByFreq = Object.entries(queryWordCounts).sort((a, b) => b[1] - a[1]);

      stats.mostCommonQueryWords = queryWordsByFreq.slice(0, 5).map((word) => `${word[0]} - ${word[1]} times`);

      const responseWordsByFreq = Object.entries(responseWordCounts).sort((a, b) => b[1] - a[1]);
      stats.mostCommonResponseWords = responseWordsByFreq.slice(0, 5).map((word) => `${word[0]} - ${word[1]} times`);

      const placeholdersByFreq = Object.entries(placeholderCounts).sort((a, b) => b[1] - a[1]);
      stats.mostUsedPlaceholder = placeholdersByFreq.length
        ? `${placeholdersByFreq[0][0]} - ${placeholdersByFreq[0][1]} times`
        : "None";

      const commandsByFreq = Object.entries(commandCounts).sort((a, b) => b[1] - a[1]);
      stats.mostUsedCommand = commandsByFreq.length
        ? `${commandsByFreq[0][0]} - ${commandsByFreq[0][1]} times`
        : "None";

      const emojisByFreq = Object.entries(emojiCounts).sort((a, b) => b[1] - a[1]);
      stats.mostUsedEmojis = emojisByFreq.slice(0, 5).map((word) => `${word[0]} - ${word[1]} times`);
    }

    let contextDataLength = 0;
    chat.contextData.forEach((context) => {
      contextDataLength += context.data.length;
    });
    stats.totalLengthOfContextData = contextDataLength + " characters";

    return stats;
  };

  return {
    chats: chats,
    isLoading: isLoading,
    error: error,
    revalidate: revalidate,
    createChat: createChat,
    appendToChat: appendToChat,
    loadConversation: loadConversation,
    favorites: favorites,
    checkExists: checkExists,
    setChatProperty: setChatProperty,
    getChatContents: getChatContents,
    calculateStats: calculateStats,
  };
}
