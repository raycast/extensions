import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import type { AgentHealthRecord } from "@/types/extension";
import { createLogger } from "@/utils/logging";

const logger = createLogger("HealthService");

interface StoredAgentHealthRecord extends Omit<AgentHealthRecord, "lastChecked"> {
  lastChecked: string;
}

export class HealthService {
  async recordSuccess(agentId: string, latencyMs?: number): Promise<AgentHealthRecord> {
    const record: AgentHealthRecord = {
      agentId,
      status: "healthy",
      lastChecked: new Date(Date.now()),
      latencyMs,
    };

    await this.upsert(record);
    return record;
  }

  async recordFailure(agentId: string, error: string): Promise<AgentHealthRecord> {
    const record: AgentHealthRecord = {
      agentId,
      status: "unhealthy",
      lastChecked: new Date(Date.now()),
      error,
    };

    await this.upsert(record);
    return record;
  }

  async get(agentId: string): Promise<AgentHealthRecord | null> {
    const records = await this.load();
    const found = records.find((item) => item.agentId === agentId);
    return found ?? null;
  }

  async getAll(): Promise<AgentHealthRecord[]> {
    const records = await this.load();
    return [...records].sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());
  }

  async prune(maxAgeMs: number): Promise<void> {
    if (maxAgeMs <= 0) {
      await this.save([]);
      return;
    }

    const records = await this.load();
    const cutoff = Date.now() - maxAgeMs;
    const filtered = records.filter((record) => record.lastChecked.getTime() >= cutoff);
    await this.save(filtered);
  }

  private async upsert(record: AgentHealthRecord): Promise<void> {
    const records = await this.load();
    const filtered = records.filter((item) => item.agentId !== record.agentId);
    filtered.push(record);
    await this.save(filtered);
  }

  private async load(): Promise<AgentHealthRecord[]> {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.AGENT_HEALTH);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored) as StoredAgentHealthRecord[];
      return parsed
        .map((item) => ({
          ...item,
          lastChecked: item.lastChecked ? new Date(item.lastChecked) : new Date(0),
        }))
        .filter((item) => item.agentId);
    } catch (error) {
      logger.error("Failed to parse agent health records", { error });
      return [];
    }
  }

  private async save(records: AgentHealthRecord[]): Promise<void> {
    const serializable: StoredAgentHealthRecord[] = records.map((item) => ({
      ...item,
      lastChecked: item.lastChecked.toISOString(),
    }));

    await LocalStorage.setItem(STORAGE_KEYS.AGENT_HEALTH, JSON.stringify(serializable));
  }
}
