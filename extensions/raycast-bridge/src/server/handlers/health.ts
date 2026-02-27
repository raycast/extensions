import http from "http";
import { environment } from "@raycast/api";
import { ok } from "../../utils/response";

const START_TIME = Date.now();

export function handleHealth(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  port: number,
) {
  ok(res, {
    status: "ok",
    bridge: "raycast-bridge",
    protocolVersion: 1,
    port,
    pid: process.pid,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    raycastVersion: environment.raycastVersion,
  });
}
