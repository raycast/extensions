import fetch from "node-fetch";
import { config } from "./config";

async function get(url: string, jwt?: string): Promise<unknown> {
  if (!jwt) {
    throw new Error("No JWT provided");
  }

  const response = await fetch(`${config.apiURL}${url}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
  if (!response.ok) {
    throw new Error(`GET request failed: ${response.status}`);
  }
  return response.json();
}

// Define the POST wrapper
async function post(url: string, body: Record<string, unknown>, jwt: string): Promise<unknown> {
  if (!jwt) throw new Error("No JWT provided");
  const response = await fetch(`${config.apiURL}${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`POST request failed: ${response.status}. Response: ${await response.text()}  `);
  }
  return await response.json();
}

export { get, post };
