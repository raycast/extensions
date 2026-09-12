import { LocalStorage } from "@raycast/api";
import { HealthService } from "@/services/healthService";
import type { AgentHealthRecord } from "@/types/extension";
import { STORAGE_KEYS } from "@/utils/storageKeys";

jest.mock("@raycast/api");

const mockLocalStorage = jest.mocked(LocalStorage);

function getStoredHealthPayload() {
  const calls = mockLocalStorage.setItem.mock.calls.filter(([key]) => key === STORAGE_KEYS.AGENT_HEALTH);
  if (calls.length === 0) return null;
  const [, payload] = calls[calls.length - 1];
  return typeof payload === "string" ? JSON.parse(payload) : payload;
}

describe("HealthService", () => {
  let service: HealthService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockLocalStorage.getItem.mockResolvedValue(null);
    service = new HealthService();
  });

  it("records a healthy status with latency", async () => {
    const record = await service.recordSuccess("agent-healthy", 85);

    expect(record).toMatchObject({
      agentId: "agent-healthy",
      status: "healthy",
      latencyMs: 85
    });

    const stored = getStoredHealthPayload();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ agentId: "agent-healthy", status: "healthy", latencyMs: 85 });
  });

  it("records an unhealthy status with error message", async () => {
    const record = await service.recordFailure("agent-fail", "Timed out");

    expect(record).toMatchObject({
      agentId: "agent-fail",
      status: "unhealthy",
      error: "Timed out"
    });

    const stored = getStoredHealthPayload();
    expect(stored[0]).toMatchObject({ agentId: "agent-fail", status: "unhealthy", error: "Timed out" });
  });

  it("retrieves existing health record", async () => {
    const initial: AgentHealthRecord[] = [
      {
        agentId: "agent-1",
        status: "healthy",
        lastChecked: new Date("2025-02-01T10:00:00Z"),
        latencyMs: 100
      }
    ];

    mockLocalStorage.getItem.mockResolvedValueOnce(JSON.stringify(initial));

    const record = await service.get("agent-1");
    expect(record).not.toBeNull();
    expect(record).toMatchObject({ agentId: "agent-1", latencyMs: 100 });
    expect(record?.lastChecked).toBeInstanceOf(Date);
  });

  it("returns null when no record exists", async () => {
    const record = await service.get("missing");
    expect(record).toBeNull();
  });

  it("prunes outdated records", async () => {
    const now = new Date("2025-02-01T12:00:00Z");
    const oldRecord: AgentHealthRecord = {
      agentId: "old",
      status: "healthy",
      lastChecked: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7)
    };
    const recentRecord: AgentHealthRecord = {
      agentId: "recent",
      status: "healthy",
      lastChecked: new Date(now.getTime() - 1000 * 60)
    };

    mockLocalStorage.getItem.mockResolvedValueOnce(JSON.stringify([oldRecord, recentRecord]));
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now.getTime());

    await service.prune(1000 * 60 * 60 * 24);

    nowSpy.mockRestore();

    const stored = getStoredHealthPayload();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ agentId: "recent" });
  });

  it("returns all health records sorted by recency", async () => {
    const records: AgentHealthRecord[] = [
      {
        agentId: "a",
        status: "healthy",
        lastChecked: new Date("2025-02-01T08:00:00Z"),
        latencyMs: 150
      },
      {
        agentId: "b",
        status: "unhealthy",
        lastChecked: new Date("2025-02-01T12:00:00Z"),
        error: "Crash"
      }
    ];

    mockLocalStorage.getItem.mockResolvedValueOnce(JSON.stringify(records));

    const result = await service.getAll();
    expect(result.map((r) => r.agentId)).toEqual(["b", "a"]);
    expect(result[0].lastChecked).toBeInstanceOf(Date);
  });
});
