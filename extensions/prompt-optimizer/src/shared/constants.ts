import { Icon } from "@raycast/api";
import { TargetModeInfo } from "./types";

export const DEFAULT_EXECUTION_MODEL = "gpt-5.2";
export const OPENAI_API_KEYS_URL = "https://platform.openai.com/api-keys";

export const TARGET_MODES: TargetModeInfo[] = [
  {
    key: "chat",
    title: "Chat",
    icon: Icon.Message,
    description: "Execution context: standard LLM chat",
    executionContext: "Plain chat. The prompt is the only context; no external state or tools. (eg ChatGPT)",
  },
  {
    key: "agent",
    title: "Agent",
    icon: Icon.CheckList,
    description: "Execution context: agent with planning, local context, and tools",
    executionContext:
      "Goal-driven agent. Can plan steps and may use tools; often has local context. (eg Claude Code, Codex, etc ...)",
  },
  {
    key: "automation",
    title: "Automation",
    icon: Icon.Hammer,
    description: "Execution context: automation step or system prompt with fixed input and no interaction",
    executionContext: "Non-interactive, fixed-input automation step. (eg System prompt, jobs)",
  },
];
