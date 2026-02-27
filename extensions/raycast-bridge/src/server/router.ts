import http from "http";
import { handleHealth } from "./handlers/health";
import { handleRun } from "./handlers/run";
import {
  handleListExtensions,
  handleGetExtension,
} from "./handlers/extensions";
import { handleApps } from "./handlers/apps";
import {
  handleFrontmost,
  handleClipboard,
  handleSelectedText,
} from "./handlers/system";
import { handleShutdown } from "./handlers/shutdown";
import { fail } from "../utils/response";

export function createServer(onClose: () => void): http.Server {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", "http://127.0.0.1");
    const { method } = req;
    const { pathname } = url;

    try {
      // GET /health
      if (method === "GET" && pathname === "/health") {
        const port = (server.address() as { port: number })?.port;
        handleHealth(req, res, port);
        return;
      }

      // POST /run
      if (method === "POST" && pathname === "/run") {
        await handleRun(req, res);
        return;
      }

      // GET /extensions
      if (method === "GET" && pathname === "/extensions") {
        handleListExtensions(req, res);
        return;
      }

      // GET /extensions/:author/:name
      if (
        method === "GET" &&
        pathname.startsWith("/extensions/") &&
        pathname.split("/").length === 4
      ) {
        const parts = pathname.split("/");
        handleGetExtension(req, res, parts[2], parts[3]);
        return;
      }

      // GET /apps
      if (method === "GET" && pathname === "/apps") {
        await handleApps(req, res);
        return;
      }

      // GET /frontmost
      if (method === "GET" && pathname === "/frontmost") {
        await handleFrontmost(req, res);
        return;
      }

      // GET /clipboard
      if (method === "GET" && pathname === "/clipboard") {
        await handleClipboard(req, res);
        return;
      }

      // GET /selected-text
      if (method === "GET" && pathname === "/selected-text") {
        await handleSelectedText(req, res);
        return;
      }

      // DELETE /shutdown
      if (method === "DELETE" && pathname === "/shutdown") {
        handleShutdown(req, res, server, onClose);
        return;
      }

      // 404
      fail(res, 404, "NOT_FOUND", `No route for ${method} ${pathname}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      fail(res, 500, "INTERNAL_ERROR", message);
    }
  });

  return server;
}
