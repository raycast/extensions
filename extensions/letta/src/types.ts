/**
 * Shared Types for Letta Raycast Extension
 */

import { Color } from "@raycast/api";

/**
 * A configured Letta account (project)
 */
export interface LettaAccount {
  id: string; // e.g., "project1", "project2"
  name: string; // User-defined project name
  apiKey: string;
  baseUrl?: string;
}

/**
 * Agent with account information for multi-account support
 */
export interface AgentWithAccount {
  id: string;
  name: string;
  description?: string | null;
  color: Color;
  accountId: string; // Which account this agent belongs to
  accountName: string; // Project name for display
}

/**
 * A single message in a conversation
 */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reasoning?: string;
  toolCalls?: ToolCall[];
}

/**
 * Tool call information
 */
export interface ToolCall {
  name: string;
  arguments?: Record<string, unknown>;
  toolCallId?: string;
}

/**
 * A conversation with a specific agent
 */
export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: Color;
  accountId: string; // Which account this agent belongs to
  accountName: string; // Project name for display
  messages: Message[];
  title?: string; // Auto-generated from first message
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Summary view of a conversation for list display
 */
export interface ConversationSummary {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: Color;
  accountId: string;
  accountName: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  updatedAt: Date;
}

/**
 * Agent with assigned color for visual distinction
 */
export interface AgentWithColor {
  id: string;
  name: string;
  description?: string | null;
  color: Color;
}

/**
 * Predefined colors for agents
 */
export const AGENT_COLORS: Color[] = [
  Color.Blue,
  Color.Green,
  Color.Orange,
  Color.Purple,
  Color.Red,
  Color.Yellow,
  Color.Magenta,
];

/**
 * Get a consistent color for an agent based on its ID
 */
export function getAgentColor(agentId: string, index?: number): Color {
  if (index !== undefined) {
    return AGENT_COLORS[index % AGENT_COLORS.length];
  }
  // Hash the agent ID to get a consistent color
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash << 5) - hash + agentId.charCodeAt(i);
    hash |= 0;
  }
  return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
}

/**
 * Generate a title from the first user message
 */
export function generateConversationTitle(messages: Message[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "New Conversation";

  const content = firstUserMessage.content.trim();
  if (content.length <= 50) return content;
  return content.slice(0, 47) + "...";
}

/**
 * Create a conversation summary for list display
 */
export function createConversationSummary(conversation: Conversation): ConversationSummary {
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return {
    id: conversation.id,
    agentId: conversation.agentId,
    agentName: conversation.agentName,
    agentColor: conversation.agentColor,
    accountId: conversation.accountId,
    accountName: conversation.accountName,
    title: conversation.title || generateConversationTitle(conversation.messages),
    lastMessage: lastMessage?.content.slice(0, 100) || "No messages",
    messageCount: conversation.messages.length,
    updatedAt: conversation.updatedAt,
  };
}
