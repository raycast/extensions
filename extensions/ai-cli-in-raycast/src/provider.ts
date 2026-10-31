import { LocalStorage } from "@raycast/api";
import { t } from "./i18n";
import {
  CodexAppServer,
  type CodexEvent,
  type CodexModel,
  type ModelSelection,
  type SandboxMode,
} from "./codex";
import { AntigravityClient } from "./provider-antigravity";
import { CliChatClient } from "./provider-cli";
import type { CliProviderId } from "./cli-protocols";
export type ProviderId = "codex" | "antigravity" | CliProviderId;
export const PROVIDER_LABELS: Record<ProviderId, string> = {
  codex: "Codex",
  antigravity: "Antigravity",
  qoder: "Qoder",
  "qoder-cn": "Qoder CN",
  workbuddy: "WorkBuddy",
  gemini: "Gemini",
};
export const PROVIDER_ICONS: Readonly<Record<ProviderId, string>> = {
  codex: "provider-codex.png",
  antigravity: "provider-antigravity.png",
  qoder: "provider-qoder.png",
  "qoder-cn": "provider-qoder.png",
  workbuddy: "provider-workbuddy.png",
  gemini: "provider-gemini.png",
};
export function providerIcon(provider: string): string {
  return Object.hasOwn(PROVIDER_ICONS, provider)
    ? PROVIDER_ICONS[provider as ProviderId]
    : "chat-icon.png";
}
export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && Object.hasOwn(PROVIDER_LABELS, value);
}
export interface ChatClient {
  readonly currentThreadId: string | null;
  readonly currentTurnId: string | null;
  readonly threadSnapshot: Record<string, unknown>;
  readonly currentModelSelection: ModelSelection;
  connect(): Promise<void>;
  checkAuthentication(): Promise<void>;
  listModels(): Promise<CodexModel[]>;
  startThread(): Promise<string>;
  resumeThread(id: string): Promise<string>;
  startTurn(prompt: string, selection?: ModelSelection | null): Promise<void>;
  steer(prompt: string): Promise<void>;
  interrupt(): Promise<void>;
  close(): void;
}
export function providerCapabilities(provider: ProviderId) {
  return {
    label: PROVIDER_LABELS[provider],
    supportsSteering: provider === "codex",
  };
}
export function createProviderClient(
  provider: ProviderId,
  options: {
    onEvent(event: CodexEvent): void;
    sandbox: SandboxMode;
    cwd?: string;
    codexPath?: string;
    agyPath?: string;
    qoderPath?: string;
    qoderCnPath?: string;
    workbuddyPath?: string;
    geminiPath?: string;
    autoDetectCli?: boolean;
    liveSearch: boolean;
  },
): ChatClient {
  const explicit = {
    codex: options.codexPath,
    antigravity: options.agyPath,
    qoder: options.qoderPath,
    "qoder-cn": options.qoderCnPath,
    workbuddy: options.workbuddyPath,
    gemini: options.geminiPath,
  }[provider];
  const guardDetection = (client: ChatClient) => {
    if (options.autoDetectCli === false && !explicit?.trim())
      client.connect = async () => {
        throw new Error(
          t(
            "Automatic CLI detection is off. Set the {provider} CLI path in preferences.",
            { provider: PROVIDER_LABELS[provider] },
          ),
        );
      };
    return client;
  };
  if (provider === "codex") return guardDetection(new CodexAppServer(options));
  if (provider !== "antigravity")
    return guardDetection(
      new CliChatClient({
        ...options,
        provider,
        cliPath: {
          qoder: options.qoderPath,
          "qoder-cn": options.qoderCnPath,
          workbuddy: options.workbuddyPath,
          gemini: options.geminiPath,
        }[provider],
        sessions: {
          get: (id) =>
            LocalStorage.getItem<string>(
              `ai-in-raycast.${provider}-session.${id}`,
            ),
          set: (id, remote) =>
            LocalStorage.setItem(
              `ai-in-raycast.${provider}-session.${id}`,
              remote,
            ),
        },
      }),
    );
  return guardDetection(
    new AntigravityClient({
      ...options,
      sessions: {
        get: (id) =>
          LocalStorage.getItem<string>(`ai-in-raycast.agy-session.${id}`),
        set: (id, remote) =>
          LocalStorage.setItem(`ai-in-raycast.agy-session.${id}`, remote),
      },
    }),
  );
}
