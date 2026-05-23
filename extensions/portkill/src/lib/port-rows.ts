import type { PortProcess } from "./types";

export function sortPortRows(rows: PortProcess[]): PortProcess[] {
  return [...rows].sort((left, right) => {
    if (left.port !== right.port) {
      return left.port - right.port;
    }

    const nameCompare = left.processName.localeCompare(right.processName, undefined, { sensitivity: "base" });
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return left.pid - right.pid;
  });
}

export function extractPortFromEndpoint(endpoint: string): number | undefined {
  const localEndpoint = endpoint.split("->")[0]?.trim() ?? endpoint;
  const hostPort = localEndpoint.startsWith("[") ? localEndpoint.split("]:")[1] : localEndpoint.split(":").pop();
  if (!hostPort) {
    return undefined;
  }

  let portText = "";
  for (const character of hostPort) {
    if (character >= "0" && character <= "9") {
      portText += character;
    } else {
      break;
    }
  }

  if (portText.length === 0) {
    return undefined;
  }

  const port = Number.parseInt(portText, 10);
  return Number.isNaN(port) ? undefined : port;
}
