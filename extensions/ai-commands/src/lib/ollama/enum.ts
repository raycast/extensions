import { ChatMessageRole, ModelCapability } from "../enum";

export enum OllamaServerAuthorizationMethod {
  BASIC = "Basic",
  BEARER = "Bearer",
}

export { ChatMessageRole as OllamaApiChatMessageRole, ModelCapability as OllamaApiModelCapability };
