import { getPreferences } from "./openclaw/config";
import {
  loadControlCenterSnapshot,
  type ControlCenterSnapshot,
} from "./openclaw/control-center";
import {
  OpenClawGateway,
  type GatewayConnection,
  type GatewayHistoryMessage,
  type SendMessageResult,
} from "./openclaw/gateway";

export { getPreferences };

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export type SessionMessageOptions = {
  sessionKey?: string;
  agentId?: string;
  label?: string;
  onStream?: (content: string) => void;
  onSession?: (sessionKey: string) => void;
};

function latestUserMessage(messages: Message[]): string {
  const message = [...messages].reverse().find((item) => item.role === "user");
  if (!message?.content.trim()) {
    throw new Error("A user message is required.");
  }
  return message.content.trim();
}

async function withGateway<T>(
  operation: (gateway: OpenClawGateway) => Promise<T> | T,
): Promise<T> {
  const gateway = await OpenClawGateway.connect();
  try {
    return await operation(gateway);
  } finally {
    await gateway.close();
  }
}

export async function sendSessionMessage(
  message: string,
  options: SessionMessageOptions = {},
): Promise<SendMessageResult> {
  return withGateway((gateway) => gateway.sendMessage(message, options));
}

export async function sendMessage(
  messages: Message[],
  onStream?: (content: string) => void,
): Promise<string> {
  const message = latestUserMessage(messages);
  const result = await sendSessionMessage(message, {
    label: message.slice(0, 80),
    onStream,
  });
  return result.content;
}

export async function askQuestion(question: string): Promise<string> {
  return sendMessage([{ role: "user", content: question }]);
}

export async function checkGatewayConnection(): Promise<GatewayConnection> {
  return withGateway((gateway) => gateway.connection);
}

export async function loadSessionHistory(
  sessionKey: string,
  agentId?: string,
): Promise<GatewayHistoryMessage[]> {
  return withGateway((gateway) =>
    gateway.getSessionHistory(sessionKey, agentId),
  );
}

export async function getControlCenterSnapshot(): Promise<ControlCenterSnapshot> {
  return withGateway(loadControlCenterSnapshot);
}

export type { ControlCenterSnapshot };
