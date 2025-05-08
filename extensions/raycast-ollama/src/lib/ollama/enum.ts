export enum OllamaServerAuthorizationMethod {
  BASIC = "Basic",
  BEARER = "Bearer",
}

export enum OllamaApiChatMessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
}

export enum OllamaApiModelCapability {
  COMPLETION = "completion",
  TOOLS = "tools",
  INSERT = "insert",
  VISION = "vision",
  EMBEDDING = "embedding",
}
