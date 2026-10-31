import type { ProviderId } from "./provider";
import type { ModelSelection } from "./codex";

export type ModelPolicy = {
  mode: "last" | "fixed";
  selection: ModelSelection | null;
};

const MODEL_POLICY_PREFERENCES = {
  codex: "codexModelStrategy",
  antigravity: "agyModelStrategy",
  qoder: "qoderModelStrategy",
  "qoder-cn": "qoderCnModelStrategy",
  workbuddy: "workbuddyModelStrategy",
  gemini: "geminiModelStrategy",
} as const;

export function modelPolicyPreference(provider: ProviderId) {
  return MODEL_POLICY_PREFERENCES[provider];
}

export function resolveModelPolicy(
  raw: string | undefined | null,
  provider: ProviderId,
  preferences: object,
): ModelPolicy {
  const stored = parseModelPolicy(raw);
  const native = (
    preferences as Partial<
      Record<ReturnType<typeof modelPolicyPreference>, unknown>
    >
  )[modelPolicyPreference(provider)];
  return native === "last" || native === "fixed"
    ? { ...stored, mode: native }
    : stored;
}

export function parseModelPolicy(raw: string | undefined | null): ModelPolicy {
  if (!raw?.trim()) return { mode: "last", selection: null };
  try {
    const value = JSON.parse(raw);
    if (value?.mode === "last") return { mode: "last", selection: null };
    if (value?.mode === "fixed") {
      const selection = value.selection;
      return {
        mode: "fixed",
        selection:
          typeof selection?.model === "string" &&
          selection.model.trim() &&
          typeof selection.effort === "string"
            ? { model: selection.model, effort: selection.effort }
            : null,
      };
    }
  } catch {
    // A stored policy that cannot be read must never silently enable a
    // different default. The settings form can explicitly repair/reset it.
  }
  return { mode: "fixed", selection: null };
}

export const PROVIDERS = [
  {
    id: "codex",
    title: "Codex CLI",
    description: "Streaming local Codex conversations",
  },
  {
    id: "antigravity",
    title: "Antigravity CLI",
    description: "Chat through your installed agy CLI",
  },
  { id: "qoder", title: "Qoder CLI", description: "International Qoder CLI" },
  {
    id: "qoder-cn",
    title: "Qoder CN CLI",
    description: "Qoder CN with its own sign-in and sessions",
  },
  {
    id: "workbuddy",
    title: "WorkBuddy CLI",
    description: "WorkBuddy's installed command-line client",
  },
  {
    id: "gemini",
    title: "Gemini CLI",
    description: "Google Gemini CLI with its own sessions",
  },
];
export const ACTIVE_PROVIDER_KEY = "ai-in-raycast.active-provider.v1";
export function storageKeys(provider: ProviderId) {
  if (provider === "codex")
    return {
      library: "ask-codex.conversations.v2",
      legacy: "ask-codex.current-conversation.v1",
      model: "ask-chatgpt.model-selection.v1",
      modelPolicy: "ai-in-raycast.codex.model-policy.v1",
      setup: "codex-in-raycast.setup.v1",
    };
  const prefix = `ai-in-raycast.${provider}`;
  return {
    library: `${prefix}.conversations.v2`,
    legacy: `${prefix}.legacy`,
    model: `${prefix}.model.v1`,
    modelPolicy: `${prefix}.model-policy.v1`,
    setup: `${prefix}.setup.v1`,
  };
}
