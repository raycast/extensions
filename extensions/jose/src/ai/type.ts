import { ReplacePlaceholders } from "./logic/clear";

export const AssistantDefaultTemperature = "0.7";
export const SnippetDefaultTemperature = "0.7";
export const ConversationSelectedTypeAssistant = "assistant";
export const ConversationSelectedTypeSnippet = "snippet";

export enum EMessage_role {
  USER = "user",
  AI = "ai",
  SYSTEM = "system",
  FUNCTION = "function",
  TOOL = "tool",
}

export interface ITalk {
  id: string;
  llm: {
    llm: string | undefined;
    model: string | undefined;
    temperature: string | undefined;
    stream: boolean;
  };
  user: {
    id: string;
    name: string;
    email: string | undefined;
  };
  device: {
    name: string;
  };
  conversation: {
    id: string;
    type: string;
    system: string | undefined;
    question: ITalkQuestion;
    history: ITalkHistory[];
  };
  assistant: {
    id: string;
    object: ITalkAssistant;
  };
  snippet: {
    id: string | undefined;
    object: ITalkSnippet | undefined;
  };
  createdAt: string;
  result: ITalkDataResult | undefined;
}

export const initData = (d: ITalk): ITalk => {
  let promptString = d.assistant.object.promptSystem;
  d.llm.temperature = d.assistant.object.modelTemperature || AssistantDefaultTemperature;
  let model = d.assistant.object.model;
  if (d.snippet.object?.promptSystem && d.conversation.type === ConversationSelectedTypeSnippet) {
    promptString = d.snippet.object.promptSystem;
    d.llm.temperature = d.snippet.object.modelTemperature || SnippetDefaultTemperature;
    model = d.snippet.object.model;
  }
  const models = model.split("__");
  d.llm.llm = models[0];
  d.llm.model = models[1];
  d.conversation.system = ReplacePlaceholders(d, promptString);

  return d;
};

export interface ITalkQuestion {
  content: string;
  files: ITalkQuestionFile[] | undefined;
}
export interface ITalkQuestionFile {
  type: string;
  path: string;
  base64: string | undefined;
  url: string | undefined;
}

export interface ITalkHistory {
  role: EMessage_role;
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functions?: any[];
  functionCall?: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arguments: any;
  };
}

export interface ITalkDataResult {
  content: string;
  finish: boolean;
  createdAt: string;
  assistant: ITalkAssistant | undefined;
  image:
    | {
        exist: boolean;
        url: string[];
      }
    | undefined;
  action:
    | {
        type: string;
        name: string;
        status: string;
      }
    | undefined;
}

export const newTalkDataResult = (): ITalkDataResult => {
  return {
    content: "",
    finish: false,
    createdAt: new Date().toISOString(),
    assistant: undefined,
    image: undefined,
    action: undefined,
  };
};

export interface ITalkAssistant {
  typeCommunication: string;
  assistantId: string;
  title: string;
  description: string;
  emoji: string;
  avatar: string;
  model: string;
  modelTemperature: string;
  promptSystem: string;
  webhookUrl: string | undefined;
  additionalData: string | undefined;
  snippet: string[] | undefined;
  isLocal: boolean;
}

export interface ITalkSnippet {
  typeCommunication: string;
  snippetId: string;
  title: string;
  category: string;
  emoji: string;
  model: string;
  modelTemperature: string;
  promptSystem: string;
  webhookUrl: string | undefined;
  isLocal: boolean;
}
