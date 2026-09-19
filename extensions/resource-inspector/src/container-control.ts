import { Agent, request } from "node:http";
import { ContainerRow } from "./model";

type Response = { status: number; body: string };
export type ContainerRequest = (
  method: "GET" | "POST",
  path: string,
  timeout: number,
) => Promise<Response>;

class RequestTimeout extends Error {}

export function localContainerClient(socketPath: string) {
  const agent = new Agent({ keepAlive: true, maxSockets: 1 });
  const send: ContainerRequest = (method, path, timeout) =>
    new Promise((resolve, reject) => {
      const req = request({ socketPath, agent, method, path }, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > 1024 * 1024)
            req.destroy(new Error("Unexpectedly large container response"));
        });
        res.on("error", reject);
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      });
      const timer = setTimeout(() => {
        req.destroy(new RequestTimeout("Container request timed out"));
      }, timeout);
      req.on("close", () => clearTimeout(timer));
      req.on("error", reject);
      req.end();
    });
  return { send, close: () => agent.destroy() };
}

export function validateContainer(
  expected: Pick<ContainerRow, "id" | "startedAt">,
  current: Pick<ContainerRow, "id" | "startedAt">,
) {
  if (current.id !== expected.id || current.startedAt !== expected.startedAt)
    throw new Error(
      "This container has restarted or changed. Refresh before acting.",
    );
}

export async function stopWithClient(
  expected: ContainerRow,
  force: boolean,
  send: ContainerRequest,
  stopTimeout = 10000,
): Promise<string> {
  if (!/^[a-f0-9]{64}$/.test(expected.id) || !expected.startedAt)
    throw new Error("Invalid container identity");
  const base = `/containers/${expected.id}`;
  const action = force ? `${base}/kill?signal=KILL` : `${base}/stop?t=-1`;
  async function inspect(afterAction = false) {
    const response = await send("GET", `${base}/json`, 8000);
    if (response.status === 404) return undefined;
    if (response.status !== 200)
      throw new Error(`Container inspection failed (${response.status})`);
    const info = JSON.parse(response.body);
    if (
      typeof info.Id !== "string" ||
      typeof info.State?.StartedAt !== "string" ||
      typeof info.State?.Running !== "boolean"
    )
      throw new Error("Container identity could not be verified");
    try {
      validateContainer(expected, {
        id: info.Id,
        startedAt: info.State.StartedAt,
      });
    } catch (error) {
      if (afterAction)
        throw new Error(
          "This container restarted while the stop request was in progress. No additional stop was sent. Refresh before acting again.",
        );
      throw error;
    }
    return info as {
      State: { Running: boolean };
      Config?: { StopSignal?: string };
    };
  }

  // All client/socket setup is complete. Inspect at the last client boundary and
  // dispatch directly over the local socket, without another CLI launch/lookup.
  // Docker offers no atomic StartedAt precondition: a daemon-side restart can
  // still race this request. Never retry it against a replacement instance.
  const current = await inspect();
  if (!current || !current.State.Running) return "exited";
  if (!force && /^(SIG)?KILL$|^9$/i.test(current.Config?.StopSignal ?? ""))
    throw new Error(
      "This container is configured to kill immediately. Use the separate Force Stop action if intended.",
    );
  try {
    const response = await send("POST", action, stopTimeout);
    if (![204, 304, 404].includes(response.status))
      throw new Error(`Container stop request failed (${response.status})`);
  } catch (error) {
    // Disconnecting the client does not change the daemon's infinite stop timeout.
    if (!(error instanceof RequestTimeout)) throw error;
  }
  const after = await inspect(true);
  return !after || !after.State.Running ? "exited" : "requested";
}
