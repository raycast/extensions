import type {
  PingDiagnosis,
  PingProbeResult,
  PingProbeSet,
  ProbeState,
} from "./types";

export function getProbeStateLabel(state: ProbeState): string {
  switch (state) {
    case "pass":
      return "Работает";
    case "fail":
      return "Ошибка";
    case "not-detected":
      return "Не обнаружено";
    case "unknown":
      return "Неизвестно";
  }
}

export function diagnosePing(probes: PingProbeSet): PingDiagnosis {
  const { gateway, internet, server, vpn } = probes;
  const localPathConfirmedByVpn =
    gateway.state === "unknown" && vpn.state === "pass";

  if ((gateway.packetLossPercent ?? 0) > 0) {
    return {
      code: "local-network",
      title: "Потери пакетов в локальной сети",
      summary: `${gateway.packetLossPercent}% пакетов теряется между Mac и роутером.`,
    };
  }

  if ((internet.packetLossPercent ?? 0) > 0) {
    return {
      code: "isp-or-internet",
      title: "Потери пакетов в интернете",
      summary: `${internet.packetLossPercent}% пакетов теряется после нормального соединения с роутером.`,
    };
  }

  if (internet.state === "pass") {
    if (server.state === "fail") {
      return {
        code: "remote-server",
        title: "Удалённый сервер",
        summary:
          "Интернет доступен, но настроенный удалённый сервер не отвечает.",
      };
    }

    if (
      server.state !== "pass" ||
      (gateway.state !== "pass" && !localPathConfirmedByVpn)
    ) {
      return {
        code: "inconclusive",
        title: "Нельзя точно определить",
        summary:
          "Интернет доступен, но локальная или удалённая проверка не подтвердила весь маршрут.",
      };
    }

    return {
      code: "healthy",
      title: "В сети",
      summary: localPathConfirmedByVpn
        ? "Точка проверки интернета и удалённый сервер доступны через обнаруженный VPN-маршрут."
        : "Роутер, интернет и удалённый сервер доступны.",
    };
  }

  if (internet.state === "fail") {
    if (vpn.state === "pass") {
      return {
        code: "vpn",
        title: "Маршрут через VPN",
        summary:
          "Проверка интернета не удалась, при этом обнаружена активность VPN или VPN-маршрут.",
      };
    }

    if (vpn.state === "unknown") {
      return {
        code: "inconclusive",
        title: "Нельзя точно определить",
        summary:
          "Проверка интернета не удалась, а состояние VPN проверить не удалось — определить проблемный участок нельзя.",
      };
    }

    if (gateway.state === "fail") {
      return {
        code: "local-network",
        title: "Локальная сеть",
        summary:
          "Нет связи с роутером и интернетом; проверьте Wi-Fi, Ethernet или сам роутер.",
      };
    }

    if (gateway.state === "pass") {
      return {
        code: "isp-or-internet",
        title: "Провайдер / интернет",
        summary:
          "Роутер отвечает, но интернет — нет; проблема за пределами локальной сети или у провайдера.",
      };
    }
  }

  if (gateway.state !== "pass" || server.state !== "pass") {
    return {
      code: "inconclusive",
      title: "Нельзя точно определить",
      summary:
        "Некоторые проверки не завершились, поэтому определить проблемный участок нельзя.",
    };
  }

  return {
    code: "inconclusive",
    title: "Нельзя точно определить",
    summary: "Проверка сети не дала достаточно данных для диагноза.",
  };
}

export function getProbeDetail(probe: PingProbeResult): string {
  const state =
    probe.id === "gateway" && probe.state === "unknown"
      ? "Не определён"
      : probe.id === "speed" && probe.state === "not-detected"
        ? "Не измерено"
        : getProbeStateLabel(probe.state);
  const latency =
    probe.latencyMs === undefined
      ? undefined
      : `${probe.latencyMs.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} мс`;
  const packetLoss =
    probe.packetLossPercent === undefined
      ? undefined
      : `Потери ${probe.packetLossPercent}%`;
  const download =
    probe.downloadMbps === undefined
      ? undefined
      : `↓ ${probe.downloadMbps.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} Мбит/с`;

  return [state, latency, packetLoss, download, probe.detail]
    .filter(Boolean)
    .join(" · ");
}
