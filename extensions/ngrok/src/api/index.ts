import fetch from "node-fetch";

import { config } from "./config";
import { runAppleScript } from "@raycast/utils";
import type { NgrokError, ReservedDomain, Tunnel } from "./types";

export * from "./types";

export async function checkIsNgrokReady() {
  try {
    const response = await fetch(`${config.localApi}/api/tunnels`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function connectNgrok() {
  await runAppleScript(`
    tell application "Terminal"
      do script "ngrok start --none --authtoken=${config.authToken}"
    end tell
  `);

  await new Promise((resolve) => setTimeout(resolve, 2500));
}

export async function createTunnel(port: number, domain: string | undefined, label: string | undefined) {
  const response = await fetch(`${config.localApi}/api/tunnels`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "http",
      proto: "http",
      addr: port,
      domain,
      metadata: label,
    }),
  });

  if (!response.ok) {
    const err = (await response.json()) as NgrokError;
    console.log(err);
    if (err.error_code !== "ERR_NGROK_810") {
      throw new Error(err.msg);
    }
  }

  const data = (await response.json()) as { public_url: string };
  return data.public_url;
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
    console.log(err);
    throw new Error(err.msg);
  }

  const data = (await response.json()) as { tunnels: Tunnel[] };

  return data;
}

export async function stopTunnel(tunnelSessionId: string) {
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
    console.log(err);
    if (err.error_code !== "ERR_NGROK_810") {
      throw new Error(err.msg);
    }
  }
}

export async function fetchDomains() {
  const response = await fetch(`${config.baseUrl}/reserved_domains`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Ngrok-Version": "2",
    },
  });

  if (!response.ok) {
    const err = (await response.json()) as NgrokError;
    console.log(err);
    throw new Error(err.msg);
  }

  const data = (await response.json()) as { reserved_domains: ReservedDomain[] };

  return data;
}
