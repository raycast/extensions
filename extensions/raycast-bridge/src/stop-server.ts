import http from "http";
import { showHUD } from "@raycast/api";

const DEFAULT_PORT = 17638;

function sendShutdown(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/shutdown",
        method: "DELETE",
        timeout: 3000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
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

export default async function main() {
  const success = await sendShutdown(DEFAULT_PORT);

  if (success) {
    await showHUD("Bridge server stopped");
  } else {
    await showHUD("Bridge server is not running");
  }
}
