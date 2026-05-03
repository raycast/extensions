import WebSocket from "ws";
import { getPreferenceValues } from "@raycast/api";
import { ClientEvent, Preferences, ServerEvent } from "./types";

function getWsUrl(): string {
  const { host, port } = getPreferenceValues<Preferences>();
  return `ws://${host}:${port}`;
}

function makeAuthHeader(prefs: Preferences): string | null {
  if (!prefs.username && !prefs.password) return null;
  return (
    "Basic " +
    Buffer.from(`${prefs.username}:${prefs.password}`).toString("base64")
  );
}

export interface FeishinConnection {
  send: (event: ClientEvent) => void;
  close: () => void;
}

export function createConnection(
  onMessage: (event: ServerEvent) => void,
  onError?: (err: Error) => void,
  onClose?: () => void,
): FeishinConnection {
  const prefs = getPreferenceValues<Preferences>();
  const authHeader = makeAuthHeader(prefs);
  const ws = new WebSocket(getWsUrl());

  ws.on("open", () => {
    if (authHeader) {
      ws.send(JSON.stringify({ event: "authenticate", header: authHeader }));
    }
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as ServerEvent;
      onMessage(msg);
    } catch (e) {
      void e;
    }
  });

  ws.on("error", (err) => onError?.(err as Error));
  ws.on("close", () => onClose?.());

  return {
    send: (event) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    },
    close: () => ws.close(),
  };
}

export async function sendCommand(
  event: Exclude<ClientEvent, ClientAuth>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const prefs = getPreferenceValues<Preferences>();
    const authHeader = makeAuthHeader(prefs);
    const ws = new WebSocket(getWsUrl());

    const timer = setTimeout(() => {
      ws.close();
      reject(
        new Error(
          "Connection timed out. Is Feishin running with Remote Control enabled?",
        ),
      );
    }, 5000);

    ws.on("open", () => {
      if (authHeader) {
        ws.send(JSON.stringify({ event: "authenticate", header: authHeader }));
      }
      ws.send(JSON.stringify(event));
      setTimeout(() => {
        clearTimeout(timer);
        ws.close();
        resolve();
      }, 300);
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err as Error);
    });
  });
}
