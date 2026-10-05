import { describe, expect, it } from "vitest";

import { PingService } from "./service";
import type { PingProbeSet, PingProvider } from "./types";

const probes: PingProbeSet = {
  gateway: {
    id: "gateway",
    label: "Роутер",
    state: "pass",
    detail: "Gateway replied",
  },
  internet: {
    id: "internet",
    label: "Проверка интернета",
    state: "pass",
    detail: "HTTP 204",
    latencyMs: 12,
  },
  server: {
    id: "server",
    label: "Удалённый сервер",
    state: "pass",
    detail: "HTTP 200",
    latencyMs: 20,
  },
  vpn: {
    id: "vpn",
    label: "Активность VPN",
    state: "not-detected",
    detail: "No active VPN detected",
  },
  speed: {
    id: "speed",
    label: "Скорость скачивания",
    state: "pass",
    detail: "Measured on en0",
    downloadMbps: 84.3,
  },
};

describe("PingService", () => {
  it("adds a deterministic timestamp and diagnosis to provider probes", async () => {
    const provider: PingProvider = { check: async () => probes };
    const result = await new PingService(
      provider,
      () => new Date("2026-08-11T00:00:00.000Z"),
    ).check();

    expect(result).toEqual({
      ...probes,
      checkedAt: "2026-08-11T00:00:00.000Z",
      diagnosis: expect.objectContaining({ code: "healthy" }),
    });
  });
});
