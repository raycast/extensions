import fetch from "node-fetch";

import { runAppleScript } from "@raycast/utils";

import { config } from "./config";
import type { NgrokError, ReservedDomain, Tunnel, TunnelSession } from "./types";

export * from "./agent";
export * from "./types";

export async function connectNgrok() {
  await runAppleScript(`
    tell application "Terminal"
      do script "ngrok start --none --authtoken=${config.authToken}"
    end tell
  `);

  await new Promise((resolve) => setTimeout(resolve, 5000));
}

export async function fetchTunnelSessions() {
  const response = await fetch(`${config.baseUrl}/tunnel_sessions`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Ngrok-Version": "2",
    },
  });

  if (!response.ok) {
    const err = (await response.json()) as NgrokError;
    console.error(err);
    throw new Error(err.msg);
  }

  const data = (await response.json()) as { tunnel_sessions: TunnelSession[] };

  return data.tunnel_sessions;
}

export async function fetchTunnels() {
  const response = await fetch(`${config.baseUrl}/tunnels`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Ngrok-Version": "2",
    },
  });

  if (!response.ok) {
    const err = (await response.json()) as NgrokError;
    console.error(err);
    throw new Error(err.msg);
  }

  const data = (await response.json()) as { tunnels: Tunnel[] };

  return data.tunnels;
}

export async function stopTunnelAgent(tunnelSessionId: string) {
  const response = await fetch(`${config.baseUrl}/tunnel_sessions/${tunnelSessionId}/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Ngrok-Version": "2",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const err = (await response.json()) as NgrokError;
    console.error(err);
    if (err.error_code !== "ERR_NGROK_810") {
      throw new Error(err.msg);
    }
  }
}

export async function fetchReservedDomains() {
  const response = await fetch(`${config.baseUrl}/reserved_domains`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Ngrok-Version": "2",
    },
  });

  if (!response.ok) {
    const err = (await response.json()) as NgrokError;
    console.error(err);
    throw new Error(err.msg);
  }

  const data = (await response.json()) as { reserved_domains: ReservedDomain[] };

  return data;
}
