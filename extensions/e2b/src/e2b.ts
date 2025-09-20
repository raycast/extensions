import { Execution } from "@e2b/code-interpreter";
import fetch from "node-fetch";

const BASE_URL = "https://extensions-api-proxy.raycast.com/e2b/sandbox";

interface CreateSandboxResponse {
  id: string;
}

interface KillSandboxResponse {
  success: boolean;
}

export async function createSandbox(timeoutMs?: number) {
  const response = await fetch(`${BASE_URL}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ timeoutMs }),
  });
  const data = (await response.json()) as CreateSandboxResponse;

  return data.id;
}

export async function runCode(sandboxId: string, code: string) {
  const response = await fetch(`${BASE_URL}/run-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, code }),
  });
  const data = (await response.json()) as Execution;
  return data;
}

export async function killSandbox(sandboxId: string) {
  console.log(`Kill sandbox`, { sandboxId });
  const response = await fetch(`${BASE_URL}/kill`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId }),
  });
  const data = (await response.json()) as KillSandboxResponse;
  console.log("> Kill sandbox response", JSON.stringify(data, null, 2));
  return data;
}
