export interface TalkType {
  chatId: string;
  question: TalkQuestionType;
  conversationId: string;
  conversationType: string;
  assistant: TalkAssistantType;
  snippet: TalkSnippetType | undefined;
  userName: string;
  device: string;
  createdAt: string;
  streaming: boolean;
  result: TalkDataResultType | undefined;
}

export interface TalkQuestionType {
  text: string;
  files: TalkQuestionFileType[] | undefined;
}
export interface TalkQuestionFileType {
  type: string;
  path: string;
  base64: string | undefined;
  url: string | undefined;
}

export interface TalkDataResultType {
  text: string;
  imageExist: boolean;
  images: string[] | undefined;
  actionType: string;
  actionName: string;
  actionStatus: string;
}

export interface TalkAssistantType {
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

export interface TalkSnippetType {
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
