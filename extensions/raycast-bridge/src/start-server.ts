import http from "http";
import { showHUD, LaunchType, environment } from "@raycast/api";
import { createServer } from "./server/router";

const DEFAULT_PORT = 17638;

function isOurServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/health",
        method: "GET",
        timeout: 1000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.ok === true && json.data?.bridge === "raycast-bridge");
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(() => resolve());

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        isOurServer(DEFAULT_PORT).then(async (ours) => {
          if (ours) {
            console.log(
              `Bridge server already running on port ${DEFAULT_PORT}`,
            );
            await showHUD("Bridge server is already running");
          } else {
            console.error(`Port ${DEFAULT_PORT} is in use by another process`);
            await showHUD(`Port ${DEFAULT_PORT} is in use by another process`);
          }
          resolve();
        });
      } else {
        reject(err);
      }
    });

    server.listen(DEFAULT_PORT, "127.0.0.1", () => {
      console.log(
        `Bridge server listening on http://127.0.0.1:${DEFAULT_PORT}`,
      );
    });

    const cleanup = () => {
      server.close(() => resolve());
    };
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);

    // Promise never resolves while server is running — keeps no-view command alive
  });
}

export default async function main() {
  if (environment.launchType === LaunchType.UserInitiated) {
    await showHUD("Starting Bridge Server...");
  }

  await startServer();
}
