import fetch, { FetchError } from "node-fetch";

import { config } from "./config";
import { LocalTunnel } from "./types";

export async function checkIsNgrokReady() {
  try {
    const response = await fetch(`${config.localApi}/api`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function createTunnel(
  port: number,
  domain: string | undefined,
  tag: string | undefined,
  cloudEdgeLabels: string | undefined,
) {
  try {
    const response = await fetch(`${config.localApi}/api/tunnels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        cloudEdgeLabels
          ? {
              name: `port_${port}_${Date.now()}`,
              addr: port,
              metadata: tag,
              labels: [...cloudEdgeLabels.split(",")],
            }
          : {
              name: `port_${port}_${Date.now()}`,
              proto: "http",
              addr: port,
              domain,
              metadata: tag,
            },
      ),
    });

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error(errMsg);
    }

    const data = (await response.json()) as { public_url: string };
    return data.public_url;
  } catch (error) {
    if (error instanceof FetchError && error.code === "ECONNREFUSED") {
      throw new Error("Interface not found on port 4040");
    }
    throw new Error((error as Error).message);
  }
}

export async function fetchLocalTunnels() {
  try {
    const isReady = await checkIsNgrokReady();
    if (!isReady) return [];

    const response = await fetch(`${config.localApi}/api/tunnels`);

    if (!response.ok) {
      const err = await response.json();
      console.error(err);
    }

    const data = (await response.json()) as { tunnels: LocalTunnel[] };

    return data.tunnels;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export async function stopTunnel(tunnelName: string) {
  const response = await fetch(`${config.localApi}/api/tunnels/${tunnelName}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const err = (await response.json()) as FetchError;
    console.error(err);
    throw new Error(err.message);
  }
}
