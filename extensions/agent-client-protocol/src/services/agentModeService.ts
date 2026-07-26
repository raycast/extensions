/**
 * Agent Mode Service
 *
 * An agent only reveals its modes when a session is opened, so the very first chat
 * with an agent cannot offer a choice. This service remembers the modes each agent
 * reported, together with the default the user picked for it, so later chats can
 * select a mode up front instead of forcing the user to switch after the first
 * message — by which point permission prompts have already appeared.
 *
 * Kept out of the agent configuration on purpose: built-in agents are read-only,
 * but their modes should be selectable all the same.
 */

import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { createLogger } from "@/utils/logging";
import type { AgentMode } from "@/types/entities";

const logger = createLogger("AgentModeService");

interface AgentModeRecord {
  modes: AgentMode[];
  defaultModeId?: string;
}

type AgentModeStore = Record<string, AgentModeRecord>;

export class AgentModeService {
  private async readStore(): Promise<AgentModeStore> {
    try {
      const raw = await LocalStorage.getItem(STORAGE_KEYS.AGENT_MODES);
      if (!raw || typeof raw !== "string") {
        return {};
      }
      return JSON.parse(raw) as AgentModeStore;
    } catch (error) {
      logger.warn("Failed to read agent modes, starting empty", { error });
      return {};
    }
  }

  private async writeStore(store: AgentModeStore): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEYS.AGENT_MODES, JSON.stringify(store));
  }

  /**
   * Modes an agent reported the last time a session was opened with it.
   */
  async getKnownModes(agentId: string): Promise<AgentMode[]> {
    const store = await this.readStore();
    return store[agentId]?.modes ?? [];
  }

  /**
   * The mode to start new sessions with, if the user picked one.
   */
  async getDefaultMode(agentId: string): Promise<string | undefined> {
    const store = await this.readStore();
    return store[agentId]?.defaultModeId;
  }

  async setDefaultMode(agentId: string, modeId: string | undefined): Promise<void> {
    const store = await this.readStore();
    const record = store[agentId] ?? { modes: [] };

    store[agentId] = { ...record, defaultModeId: modeId };
    await this.writeStore(store);

    logger.info("Default agent mode updated", { agentId, modeId });
  }

  /**
   * Remember the modes an agent reported. Drops a stored default that the agent
   * no longer offers, so a stale id cannot be sent on every new session.
   */
  async rememberModes(agentId: string, modes: AgentMode[]): Promise<void> {
    if (modes.length === 0) {
      return;
    }

    const store = await this.readStore();
    const previousDefault = store[agentId]?.defaultModeId;
    const defaultModeId = modes.some((mode) => mode.id === previousDefault) ? previousDefault : undefined;

    store[agentId] = { modes, defaultModeId };
    await this.writeStore(store);

    logger.debug("Remembered agent modes", { agentId, modeCount: modes.length, defaultModeId });
  }
}
