import { Color } from "@raycast/api";

// Define app types enum
export enum DifyAppType {
  ChatflowAgent = "Chatflow/Agent",
  Workflow = "Workflow",
  TextGenerator = "Text Generator",
}

// Define conversation type enum
export enum DifyConversationType {
  SingleCall = "single_call",
  Continuous = "continuous",
}

// Define response mode enum
export enum DifyResponseMode {
  Blocking = "blocking",
  Streaming = "streaming",
}

// App interface definition
export interface DifyApp {
  name: string;
  endpoint: string;
  apiKey: string;
  inputs: Record<string, unknown>;
  type: DifyAppType;
  assistantName?: string; // Assistant name, optional
  responseMode?: DifyResponseMode; // Response mode: blocking or streaming, optional
  waitForResponse?: boolean; // Wait for response mode, true=wait for full response, false=only check API call success, optional, default: true
  conversationType?: DifyConversationType; // Conversation type: single_call or continuous, optional, default: continuous
  description?: string; // LLM description, optional
  createdAt?: string; // Creation timestamp with timezone info
  updatedAt?: string; // Last update timestamp with timezone info
}

// Helper function to get readable app type text
export function getAppTypeText(type: DifyAppType): string {
  switch (type) {
    case DifyAppType.ChatflowAgent:
      return "Chatflow/Agent";
    case DifyAppType.Workflow:
      return "Workflow";
    case DifyAppType.TextGenerator:
      return "Text Generator";
    default:
      return "Unknown";
  }
}

// Helper function to get color for app type
export function getAppTypeColor(type: DifyAppType): Color {
  switch (type) {
    case DifyAppType.ChatflowAgent:
      return Color.Blue;
    case DifyAppType.Workflow:
      return Color.Orange;
    case DifyAppType.TextGenerator:
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}
