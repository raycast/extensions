import { vi } from "vitest";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
// Hard tripwires: tests inject transports; even an accidental runtime call cannot reach a device.
const blocked = () => {
  throw new Error("Real network access is forbidden in tests");
};
vi.stubGlobal("fetch", vi.fn(blocked));
vi.spyOn(http, "request").mockImplementation(blocked);
vi.spyOn(http, "get").mockImplementation(blocked);
vi.spyOn(https, "request").mockImplementation(blocked);
vi.spyOn(https, "get").mockImplementation(blocked);
vi.spyOn(net.Socket.prototype, "connect").mockImplementation(blocked);
vi.spyOn(tls, "connect").mockImplementation(blocked);
