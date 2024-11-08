// This module defines the following classes:
// - Message
// - MessagePair
//
// It also defines the following utilities:
// - pairs_to_messages
// - format_chat_to_prompt
// - messages_to_json
//
// Note how we currently don't have a Chat class, and instead we just use an array of messages.

import fs from "fs";

export class Message {
  constructor({ role = "", content = "", files = [] } = {}) {
    this.role = role;
    this.content = content;
    if (files && files.length > 0) {
      this.files = files;
    }
  }
}

export class MessagePair {
  // This class is different from Message in that it contains two messages, user and assistant.
  // It is stored in JSON format in localStorage. Therefore, special care needs to be taken so that all the data
  // is stored correctly. To make this easier and more reliable, the class is completely JSON-compatible,
  // so we don't even need to serialize/deserialize it. In particular, we can use a non-Messages object as if it were
  // a MessagePair object, as long as it has the same properties.
  // In fact, currently the objects in AI Chat are not even being stored as MessagePair objects, but as plain objects,
  // but they are still being treated as MessagePair objects, and this is fine.

  // When initialising, we can pass in either prompt and answer, or first and second.
  // prompt and answer are just shortcuts to initialise the user/assistant roles; don't ever access them.
  // When accessing, always strictly use the first and second properties. e.g. messagePair.first.content for the user message.
  constructor({
    prompt = "",
    answer = "",
    first = { role: "user", content: "" },
    second = { role: "assistant", content: "" },
    creationDate = new Date(),
    id = new Date().getTime(),
    finished = false,
    visible = true,
    files = [],
  } = {}) {
    this.first = { role: "user", content: prompt };
    this.second = { role: "assistant", content: answer };
    if (first.content) this.first = first;
    if (second.content) this.second = second;

    this.creationDate = creationDate;
    this.id = id;
    this.finished = finished;
    this.visible = visible;
    if (files && files.length > 0) {
      this.files = files;
    }
  }
}

// Utilities

// Format an array of MessagePairs into an array of Messages
export const pairs_to_messages = (pairs, query = null) => {
  let chat = [];

  for (let i = pairs.length - 1; i >= 0; i--) {
    // reverse order, index 0 is latest message
    let messagePair = pairs[i];
    if (!messagePair.first.content && !messagePair.files) continue;
    chat.push(
      messagePair.files
        ? new Message({
            ...messagePair.first,
            role: messagePair.first.role,
            content: messagePair.first.content,
            files: messagePair.files,
          })
        : new Message({ ...messagePair.first, role: messagePair.first.role, content: messagePair.first.content })
    );
    if (messagePair.second.content)
      chat.push(
        new Message({ ...messagePair.second, role: messagePair.second.role, content: messagePair.second.content })
      );
  }
  if (query) chat.push(new Message({ role: "user", content: query }));
  return chat;
};

// Format an array of Messages into a single string
// model: Model string
// assistant: Whether to include the additional "Assistant:" prompt
export const format_chat_to_prompt = (chat, { model = null, assistant = true } = {}) => {
  chat = messages_to_json(chat);

  model = model?.toLowerCase() || "";
  let prompt = "";

  if (model.includes("meta-llama-3")) {
    prompt += "<|begin_of_text|>";
    for (let i = 0; i < chat.length; i++) {
      prompt += `<|start_header_id|>${chat[i].role}<|end_header_id|>`;
      prompt += `\n${chat[i].content}<|eot_id|>`;
    }
    if (assistant) prompt += "<|start_header_id|>assistant<|end_header_id|>";
  } else if (model.includes("mixtral")) {
    // <s> [INST] Prompt [/INST] answer</s> [INST] Follow-up instruction [/INST]
    for (let i = 0; i < chat.length; i++) {
      if (chat[i].role === "user") {
        prompt += `<s> [INST] ${chat[i].content} [/INST]`;
      } else if (chat[i].role === "assistant") {
        prompt += ` ${chat[i].content}</s>`;
      }
    }
    // note how prompt ends with [/INST]
  } else {
    for (let i = 0; i < chat.length; i++) {
      prompt += capitalize(chat[i].role) + ": " + chat[i].content + "\n";
    }
    if (assistant) prompt += "Assistant:";
  }

  return prompt;
};

// Format an array of Messages (NOT pairs) into a simple JSON array consisting of role and content,
// and occasionally other properties (e.g. tool call info). this is used in many OpenAI-based APIs.
//
// Modifications:
// - read files if any, and add them to the message. (unless the provider doesn't want us to include files)
// - remove the files property

export const messages_to_json = (chat, { readFiles = true } = {}) => {
  let json = [];

  for (let i = 0; i < chat.length; i++) {
    let msg = structuredClone(chat[i]);

    if (readFiles && msg.files && msg.files.length > 0) {
      console.assert(msg.role === "user", "Only user messages can have files");
      for (const file of msg.files) {
        // read text
        let text = fs.readFileSync(file, "utf8");
        text = `---\nFile: ${file}\n\n${text}`;

        // push as new message
        json.push({ role: "user", content: text });
        json.push({ role: "assistant", content: "[system: file uploaded]" });
      }
    }

    delete msg.files;
    json.push(msg);
  }
  return json;
};

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
