export type AuthProvider = "none" | "apiKey" | "chatgpt";
export type ConnectionMode = "apiKey" | "chatgpt";

export function selectAuthProvider(mode: ConnectionMode, hasApiKey: boolean, hasChatGPTSession: boolean): AuthProvider {
  if (mode === "chatgpt" && hasChatGPTSession) return "chatgpt";
  if (hasApiKey) return "apiKey";
  if (hasChatGPTSession) return "chatgpt";
  return "none";
}
