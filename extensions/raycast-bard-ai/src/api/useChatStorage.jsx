import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const noOp = new Proxy(() => noOp, {
  get: () => noOp,
  apply: () => noOp,
});

export default function useLocalStorage() {
  // Current list of conversations
  let [conversationList, setConversationList] = useState(null);

  // Names to index mapping
  let [nameToIndexMap, setNameToIndexMap] = useState({});

  // Current selected conversation
  let [conversationName, setConversationName] = useState(null);

  // LocalStorage keys
  const NAMES = {
    CONV: "conversation",
    CONV_NAME: "conversationName",
  };

  // Defaults
  const DEFAULTS = {
    CONV: [
      {
        name: "New Conversation",
        ids: {
          conversationID: undefined,
          responseID: undefined,
          choiceID: undefined,
          _reqID: "0",
        },
        questions: [],
      },
    ],
    CONV_NAME: "New Conversation",
  };

  // Way to check if LocalStorage is loaded in
  let [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(
      conversationList !== null && conversationName !== null && nameToIndexMap[conversationName] !== undefined
    );
  }, [conversationList, conversationName, nameToIndexMap]);

  // Getting current conversation
  let getCurrentConversation = (list = conversationList, name = conversationName) => {
    if (!isLoaded) return noOp;
    return list[nameToIndexMap[name]];
  };

  // Way to save and get conversation and conversation name
  let saveConversationList = (content) =>
    (async () => {
      await LocalStorage.setItem(NAMES.CONV, JSON.stringify(content));
    })();
  let saveConversationName = (name) =>
    (async () => {
      await LocalStorage.setItem(NAMES.CONV_NAME, name);
    })();
  let getConversationList = async () => {
    const item = await LocalStorage.getItem(NAMES.CONV);
    return item !== undefined ? JSON.parse(item) : undefined;
  };
  let getConversationName = async () => await LocalStorage.getItem(NAMES.CONV_NAME);

  let rebuildNameToIndexMap = (conv) => {
    setNameToIndexMap(conv.reduce((acc, cur, i) => ({ ...acc, [cur.name]: i }), {}));
  };

  useEffect(() => {
    isLoaded && rebuildNameToIndexMap(conversationList);
  }, [conversationList]);

  // Pull data from localStorage down
  useEffect(() => {
    (async () => {
      if (!(await getConversationList())) saveConversationList(DEFAULTS.CONV);
      if (!(await getConversationName())) saveConversationName(DEFAULTS.CONV_NAME);

      let conv = await getConversationList();
      setConversationList(conv);

      let convName = await getConversationName();
      setConversationName(convName);

      rebuildNameToIndexMap(conv);
    })();
  }, []);

  // Update conversation name and list in LocalStorage
  useEffect(() => {
    isLoaded && (async () => await LocalStorage.setItem(NAMES.CONV_NAME, conversationName))();
  }, [conversationName]);
  useEffect(() => {
    isLoaded && (async () => await LocalStorage.setItem(NAMES.CONV, JSON.stringify(conversationList)))();
  }, [conversationList]);

  return {
    name: [conversationName, setConversationName],
    list: [conversationList, setConversationList],
    nameToIndexMap,
    isLoaded,
    getCurrentConversation,
  };
}
