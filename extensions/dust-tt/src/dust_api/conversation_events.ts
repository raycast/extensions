export type RetrievalActionType = {
  id: number;
  type: "retrieval_action";
  documents: RetrievalDocumentType[] | null;
};

export type RetrievalDocumentType = {
  id: number;
  dataSourceWorkspaceId: string;
  dataSourceId: string;
  sourceUrl: string | null;
  documentId: string;
  reference: string; // Short random string so that the model can refer to the document.
  timestamp: number;
  tags: string[];
  score: number | null;
  chunks: {
    text: string;
    offset: number;
    score: number | null;
  }[];
};

type DustAppParameters = {
  [key: string]: string | number | boolean;
};

export type DustAppRunActionType = {
  id: number;
  type: "dust_app_run_action";
  appWorkspaceId: string;
  appId: string;
  appName: string;
  params: DustAppParameters;
  runningBlock: {
    type: string;
    name: string;
    status: "running" | "succeeded" | "errored";
  } | null;
  output: unknown | null;
};

export type DustAPIErrorResponse = {
  type: string;
  message: string;
};

export type DustDocument = {
  id: string;
  sourceUrl: string;
  dataSourceId: string;
  score: number | null;
  reference: number;
};

export type AgentMessageType = {
  id: number;
  agentMessageId: number;
  created: number;
  type: "agent_message";
  sId: string;
  visibility: "visible" | "deleted";
  version: number;
  parentMessageId: string | null;
  status: "created" | "succeeded" | "failed" | "cancelled";
  actions: AgentActionType[];
  content: string | null;
  chainOfThought: string | null;
  rawContents: Array<{
    step: number;
    content: string;
  }>;
  error: {
    code: string;
    message: string;
  } | null;
};

export type AgentActionType = RetrievalActionType | DustAppRunActionType;

export type AgentActionSuccessEvent = {
  type: "agent_action_success";
  created: number;
  configurationId: string;
  messageId: string;
  action: AgentActionType;
};

// Event sent when tokens are streamed as the the agent is generating a message.
export type GenerationTokensEvent = {
  type: "generation_tokens";
  created: number;
  configurationId: string;
  messageId: string;
  text: string;
  classification: "tokens" | "chain_of_thought" | "opening_delimiter" | "closing_delimiter";
};

// Event sent once the message is completed and successful.
export type AgentMessageSuccessEvent = {
  type: "agent_message_success";
  created: number;
  configurationId: string;
  messageId: string;
  message: AgentMessageType;
  runIds: string[];
};

// Event sent when the user message is created.
export type UserMessageErrorEvent = {
  type: "user_message_error";
  created: number;
  error: {
    code: string;
    message: string;
  };
};

// Generic event sent when an error occured (whether it's during the action or the message generation).
export type AgentErrorEvent = {
  type: "agent_error";
  created: number;
  configurationId: string;
  messageId: string;
  error: {
    code: string;
    message: string;
  };
};
