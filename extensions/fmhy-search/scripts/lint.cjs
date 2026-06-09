#!/usr/bin/env node
const { spawn } = require("node:child_process");
const http = require("node:http");

const args = process.argv.slice(2);
const useLocalRaycastApi = process.env.CI?.toLowerCase() !== "true";

function runRay(extraEnv = {}) {
  const child = spawn("ray", ["lint", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

if (!useLocalRaycastApi) {
  runRay();
} else {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (url.pathname.startsWith("/api/v1/users/") || url.pathname.startsWith("/api/v1/organizations/")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ handle: decodeURIComponent(url.pathname.split("/").pop() ?? "") }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ errors: [{ status: "404", title: "Not Found" }] }));
  });

  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close(() => process.exit(1));
      return;
    }

    runRay({ RAY_APIURL: `http://127.0.0.1:${address.port}` });
  });
}
