import ngrok from "ngrok";
import fetch from "node-fetch";

import { config } from "./config";
import type { NgrokError, Tunnel } from "./types";

export * from "./types";

export async function createTunnel(port: number, domain: string | undefined, ngrokBin: string) {
  return ngrok.connect({
    addr: port,
    web_allow_hosts: domain,
    authtoken: config.authToken,
    binPath: () => ngrokBin.replace("/ngrok", ""),
  });
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
