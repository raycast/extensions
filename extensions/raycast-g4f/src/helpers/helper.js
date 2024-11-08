import { environment } from "@raycast/api";

export const formatDate = (dateToCheckISO) => {
  // Calculate the date difference between the current date and the date to check
  // and format it like: 2y, 3mo, 4d, 5h, 6m (no seconds because updates will be too frequent)

  const d1 = new Date(),
    t1 = d1.getTime();
  const d2 = new Date(dateToCheckISO),
    t2 = d2.getTime();
  const diff = t1 - t2;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  let formatted = "now";
  // we only want one unit of time, and it should be the largest unit
  for (const [unit, value] of [
    ["y", years],
    ["mo", months],
    ["d", days],
    ["h", hours],
    ["m", minutes],
  ]) {
    if (value > 0) {
      formatted = `${value}${unit}`;
      break;
    }
  }

  return formatted;
};

export const removeFirstOccurrence = (str, substr) => {
  let idx = str.indexOf(substr);
  if (idx !== -1) {
    return str.substring(idx + substr.length);
  }
  return str;
};

export const removeLastOccurrence = (str, substr) => {
  let idx = str.lastIndexOf(substr);
  if (idx !== -1) {
    return str.substring(0, idx);
  }
  return str;
};

export const removePrefix = (str, prefix) => {
  if (str.startsWith(prefix)) {
    return str.substring(prefix.length);
  }
  return str;
};

export const removeSuffix = (str, suffix) => {
  if (str.endsWith(suffix)) {
    return str.substring(0, str.length - suffix.length);
  }
  return str;
};

export const getSupportPath = () => {
  return environment.supportPath;
};

export const getAssetsPath = () => {
  return environment.assetsPath;
};

export const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Estimate number of tokens in a string
export const tokens_estimate = (str) => {
  if (!str) return 0;
  let chars = str.length;
  let words = str.split(" ").length;
  return Math.max((words * 4) / 3, chars / 4);
};

// Truncate a message using the middle-out strategy, given a target context length
export const truncate_message_middle = (message, contextChars, contextTokens) => {
  let chars = message.content.length,
    tokens = tokens_estimate(message.content);

  if ((contextChars && chars <= contextChars) || (contextTokens && tokens <= contextTokens)) {
    return message;
  }

  if (contextChars) {
    contextChars -= 20; // buffer
    if (contextChars <= 0) {
      return "";
    }

    let half = Math.floor(contextChars / 2);
    return message.content.substring(0, half) + "\n...\n" + message.content.substring(chars - half);
  } else if (contextTokens) {
    contextTokens -= 10; // buffer
    if (contextTokens <= 0) {
      return "";
    }

    let half = Math.floor(contextTokens / 2);
    let words = message.content.split(" ");

    // binary search for both the start and end of the truncated message
    let start = 0,
      end = words.length;
    while (start < end) {
      let mid = Math.floor((start + end) / 2);
      let truncated = words.slice(0, mid).join(" ");
      if (tokens_estimate(truncated) > half) {
        end = mid;
      } else {
        start = mid + 1;
      }
    }
    let firstHalf = words.slice(0, start).join(" ");

    start = end;
    end = words.length;
    while (start < end) {
      let mid = Math.floor((start + end) / 2);
      let truncated = words.slice(mid).join(" ");
      if (tokens_estimate(truncated) > half) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    let secondHalf = words.slice(start).join(" ");
    return firstHalf + "\n...\n" + secondHalf;
  }

  return message.content;
};

// Given an array of Messages and a provider info, return the
// longest chat array that fits within the context length
export const truncate_chat = (chat, providerInfo) => {
  let contextChars = providerInfo?.context_chars || null,
    contextTokens = providerInfo?.context_tokens || null;
  if (!contextChars && !contextTokens) return chat; // undefined context length

  let newChat = [];
  let totalChars = 0,
    totalTokens = 0;

  // start from end of chat to get the most recent messages
  for (let i = chat.length - 1; i >= 0; i--) {
    let message = chat[i];
    let chars = message.content.length,
      tokens = tokens_estimate(message.content);

    totalChars += chars;
    totalTokens += tokens;

    if ((contextChars && totalChars > contextChars) || (contextTokens && totalTokens > contextTokens)) {
      let truncated = truncate_message_middle(
        message,
        contextChars && contextChars - totalChars + chars,
        contextTokens && contextTokens - totalTokens + tokens
      );
      if (message) {
        message.content = truncated;
        newChat.unshift(message);
      }
      break;
    }

    newChat.unshift(message); // add to start of array
  }

  return newChat;
};

export const current_datetime = () => {
  return new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};
