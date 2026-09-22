import { AgentId, SessionProvider } from "../types";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";
import { copilotProvider } from "./copilot";
import { crushProvider } from "./crush";
import { cursorProvider } from "./cursor";
import { droidProvider } from "./droid";
import { geminiProvider } from "./gemini";
import { gooseProvider } from "./goose";
import { opencodeProvider } from "./opencode";
import { qwenProvider } from "./qwen";

/**
 * Registry of session providers, one per entry in `AGENTS` (../agents.ts). A provider whose
 * agent is not installed simply discovers nothing, so no configuration is needed to add one.
 */
export const providers: SessionProvider[] = [
  claudeProvider,
  codexProvider,
  cursorProvider,
  geminiProvider,
  qwenProvider,
  copilotProvider,
  opencodeProvider,
  crushProvider,
  gooseProvider,
  droidProvider,
];

export function providerFor(agent: AgentId): SessionProvider {
  const p = providers.find((x) => x.id === agent);
  if (!p) throw new Error(`Unknown agent ${agent}`);
  return p;
}
