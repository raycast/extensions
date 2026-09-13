import { describe, expect, it } from "vitest";

import { diagnosePing, getProbeDetail, getProbeStateLabel } from "./domain";
import type { PingProbeResult, PingProbeSet } from "./types";

function probe(
  id: PingProbeResult["id"],
  state: PingProbeResult["state"],
): PingProbeResult {
  return {
    id,
    label: id,
    state,
    detail: `${id} detail`,
  };
}

function probes(
  gateway: PingProbeResult["state"],
  internet: PingProbeResult["state"],
  server: PingProbeResult["state"],
  vpn: PingProbeResult["state"] = "not-detected",
): PingProbeSet {
  return {
    gateway: probe("gateway", gateway),
    internet: probe("internet", internet),
    server: probe("server", server),
    vpn: probe("vpn", vpn),
    speed: probe("speed", "pass"),
  };
}

describe("Ping diagnosis", () => {
  it("reports a healthy path when every required layer responds", () => {
    expect(diagnosePing(probes("pass", "pass", "pass"))).toMatchObject({
      code: "healthy",
      title: "В сети",
    });
  });

  it("accepts an online VPN path when the tunnel has no gateway address", () => {
    expect(
      diagnosePing(probes("unknown", "pass", "pass", "pass")),
    ).toMatchObject({
      code: "healthy",
      summary:
        "Точка проверки интернета и удалённый сервер доступны через обнаруженный VPN-маршрут.",
    });
  });

  it("points to the local network when the gateway and internet fail", () => {
    expect(diagnosePing(probes("fail", "fail", "fail"))).toMatchObject({
      code: "local-network",
    });
  });

  it("points to the VPN when it is active during an internet failure", () => {
    expect(diagnosePing(probes("pass", "fail", "fail", "pass"))).toMatchObject({
      code: "vpn",
    });
  });

  it("points beyond the local network when only the internet probe fails", () => {
    expect(diagnosePing(probes("pass", "fail", "fail"))).toMatchObject({
      code: "isp-or-internet",
    });
  });

  it("does not blame the ISP when VPN inspection is unavailable", () => {
    expect(
      diagnosePing(probes("pass", "fail", "fail", "unknown")),
    ).toMatchObject({
      code: "inconclusive",
    });
  });

  it("points to the remote server when the internet works but it fails", () => {
    expect(diagnosePing(probes("pass", "pass", "fail"))).toMatchObject({
      code: "remote-server",
    });
  });

  it("attributes gateway packet loss to the local network", () => {
    const result = probes("pass", "pass", "pass");
    result.gateway.packetLossPercent = 20;

    expect(diagnosePing(result)).toMatchObject({ code: "local-network" });
  });

  it("attributes internet packet loss beyond a clean gateway to the ISP path", () => {
    const result = probes("pass", "pass", "pass");
    result.gateway.packetLossPercent = 0;
    result.internet.packetLossPercent = 20;

    expect(diagnosePing(result)).toMatchObject({ code: "isp-or-internet" });
  });

  it("stays honest when a local probe fails but the internet works", () => {
    expect(diagnosePing(probes("fail", "pass", "pass"))).toMatchObject({
      code: "inconclusive",
    });
  });
});

describe("Ping probe labels", () => {
  it("formats state, latency, and detail for the menu", () => {
    expect(getProbeStateLabel("not-detected")).toBe("Не обнаружено");
    expect(
      getProbeDetail({
        ...probe("internet", "pass"),
        latencyMs: 12.5,
      }),
    ).toBe("Работает · 12,5 мс · internet detail");
  });

  it("shows packet loss and download throughput when measured", () => {
    expect(
      getProbeDetail({
        ...probe("internet", "pass"),
        latencyMs: 15.625,
        packetLossPercent: 20,
        downloadMbps: 84.3,
      }),
    ).toBe(
      "Работает · 15,625 мс · Потери 20% · ↓ 84,3 Мбит/с · internet detail",
    );
  });

  it("calls an unmeasured download speed a measurement state, not a failure", () => {
    expect(
      getProbeDetail({
        ...probe("speed", "not-detected"),
        detail:
          "Нажмите «Измерить скорость скачивания», чтобы узнать результат.",
      }),
    ).toBe(
      "Не измерено · Нажмите «Измерить скорость скачивания», чтобы узнать результат.",
    );
  });

  it("explains an unavailable router without calling it a network failure", () => {
    expect(
      getProbeDetail({
        ...probe("gateway", "unknown"),
        detail: "Роутер не найден. В VPN-режиме это может быть нормально.",
      }),
    ).toBe(
      "Не определён · Роутер не найден. В VPN-режиме это может быть нормально.",
    );
  });
});
