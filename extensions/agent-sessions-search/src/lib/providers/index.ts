import { AgentId, SessionProvider } from "../types";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";

/** Registry of session providers. Adding Cursor later = one more entry implementing SessionProvider. */
export const providers: SessionProvider[] = [claudeProvider, codexProvider];

export function providerFor(agent: AgentId): SessionProvider {
  const p = providers.find((x) => x.id === agent);
  if (!p) throw new Error(`Unknown agent ${agent}`);
  return p;
}
