import type { AgentConfig, AgentId } from "./types";
import { CommandSpec } from "./types";
import { validateExecutablePath } from "@/utils/path";
import { messages } from "@/locale/en/messages";

export const AGENTS: Record<AgentId, AgentConfig> = {
  claude: {
    id: "claude",
    name: "Claude Code",
    pathPreferenceKey: "claudePath",
    tokenPreferenceKey: "claudeToken",
    models: {
      sonnet: { id: "sonnet", displayName: "Sonnet 4.0" },
      opus: { id: "opus", displayName: "Opus 4.1" },
      haiku: { id: "haiku", displayName: "Haiku 4.0" },
    },
    defaultModel: "sonnet",
    authEnvVar: "CLAUDE_CODE_OAUTH_TOKEN",
    buildCommand: ({ path, model, execId, continueConv }): CommandSpec => {
      const args: string[] = [];
      if (model) {
        args.push("--model", model);
      }
      if (continueConv) {
        args.push("-r", execId);
      } else {
        args.push(`--session-id`, execId);
      }
      args.push("-p");
      return { file: path, args };
    },
    validatePath: (path) => {
      const result = validateExecutablePath(path);
      if (result.valid) {
        return {
          ...result,
          warning: messages.processing.authWarning,
        };
      }
      return result;
    },
  },
  openai: {
    id: "openai",
    name: "Codex CLI",
    pathPreferenceKey: "codexPath",
    tokenPreferenceKey: "codexToken",
    models: {
      gpt5: { id: "gpt-5-medium", displayName: "GPT-5 (medium)" },
      gpt5_low: { id: "gpt-5-low", displayName: "GPT-5 (low)" },
      gpt5_high: { id: "gpt-5-high", displayName: "GPT-5 (high)" },
      gpt5_minimal: { id: "gpt-5-minimal", displayName: "GPT-5 (minimal)" },
    },
    defaultModel: "gpt5",
    authEnvVar: "OPENAI_API_KEY",
    buildCommand: ({ path, model }): CommandSpec => {
      const modelData = model ? model.split("-") : [];
      const modelReasoningEffortParam = modelData.length > 0 ? modelData[modelData.length - 1] : "medium";
      const args = [
        "-m",
        "gpt-5",
        "-c",
        `model_reasoning_effort="${modelReasoningEffortParam}"`,
        "exec",
        "--full-auto",
      ];
      return { file: path, args };
    },
    validatePath: (path) => validateExecutablePath(path),
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    pathPreferenceKey: "geminiPath",
    tokenPreferenceKey: "geminiToken",
    models: {
      flash: { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
      pro: { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
    },
    defaultModel: "pro",
    authEnvVar: "GEMINI_API_KEY",
    buildCommand: ({ path, model }): CommandSpec => {
      const args: string[] = [];
      if (model) {
        args.push("-m", model);
      }
      args.push("-p");
      return { file: path, args };
    },
    validatePath: (path) => validateExecutablePath(path),
  },
  cursor: {
    id: "cursor",
    name: "Cursor CLI",
    pathPreferenceKey: "cursorPath",
    tokenPreferenceKey: "cursorToken",
    models: {
      auto: { id: "auto", displayName: "Auto" },
      sonnet4: { id: "sonnet-4", displayName: "Claude 4 Sonnet" },
      gpt5: { id: "gpt-5", displayName: "GPT-5" },
      opus41: { id: "opus-4.1", displayName: "Claude 4.1 Opus" },
    },
    defaultModel: "auto",
    authEnvVar: "CURSOR_API_KEY",
    buildCommand: ({ path, model = "auto" }): CommandSpec => {
      const args = ["-m", model, "-p", "--output-format", "text"];
      return { file: path, args };
    },
    validatePath: (path) => validateExecutablePath(path),
  },
};
