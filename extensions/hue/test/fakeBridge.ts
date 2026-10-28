// A Hue Bridge on 127.0.0.1: HTTP/2 over TLS with the certificates test/globalSetup.ts generates. Routes answer by
// method and path prefix, the longest prefix winning, and tests replace them to make the bridge misbehave.
import http2 from "node:http2";
import net from "node:net";
import { readFileSync } from "node:fs";
import { inject } from "vitest";
import { BRIDGE_ID } from "./globalSetup";
import * as fixtures from "./fixtures/resources";
import type { BridgeConfig, HueEvent } from "../src/lib/types";

export { BRIDGE_ID };
export const USERNAME = "test-username";

export type Route = (stream: http2.ServerHttp2Stream, body: string, headers: http2.IncomingHttpHeaders) => void;
export type LoggedRequest = {
  method: string;
  path: string;
  headers: http2.IncomingHttpHeaders;
  body: string;
  // The index of the session it came on, in the order the bridge accepted them.
  session: number;
};

export const json = (stream: http2.ServerHttp2Stream, status: number, data: unknown) => {
  stream.respond({ ":status": status, "content-type": "application/json" });
  stream.end(JSON.stringify(data));
};

// The bridge's one error page, whatever went wrong.
export const html = (stream: http2.ServerHttp2Stream, status: number) => {
  stream.respond({ ":status": status, "content-type": "text/html" });
  stream.end('<html><div class="error">Oops, there appears to be no lighting here</div></html>');
};

export const resources = (data: unknown[]) => ({ errors: [], data });

const servers: { close: () => Promise<void> }[] = [];

// test/setup.ts calls this after each test.
export async function closeServers() {
  await Promise.all(servers.splice(0).map((server) => server.close()));
}

const listen = (server: net.Server) =>
  new Promise<string>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(`127.0.0.1:${(server.address() as net.AddressInfo).port}`)),
  );

export async function startBridge({
  certificate = "bridge",
  ignoreGoaway = false,
}: {
  // impostor: another bridge's ID, foreign: the bridge's ID from a root the extension doesn't trust
  certificate?: "bridge" | "impostor" | "foreign-bridge";
  // Like nginx, keeps a session open after the client's GOAWAY, which Node's server answers with its own.
  ignoreGoaway?: boolean;
} = {}) {
  const dir = inject("certDir");
  const server = http2.createSecureServer({
    key: readFileSync(`${dir}/${certificate}.key`),
    cert: readFileSync(`${dir}/${certificate}.pem`),
  });

  const sessions: http2.ServerHttp2Session[] = [];
  const requests: LoggedRequest[] = [];
  const eventStreams: http2.ServerHttp2Stream[] = [];
  let inFlight = 0;

  const authorized =
    (route: Route): Route =>
    (stream, body, headers) =>
      headers["hue-application-key"] === USERNAME ? route(stream, body, headers) : html(stream, 403);

  const routes: Record<string, Route> = {
    "GET /clip/v2/resource/bridge": authorized((s) => json(s, 200, resources([{ id: "bridge", type: "bridge" }]))),
    "GET /clip/v2/resource/bridge_home": authorized((s) => json(s, 200, resources(fixtures.bridgeHome))),
    "GET /clip/v2/resource/light": authorized((s) => json(s, 200, resources(fixtures.lights))),
    "GET /clip/v2/resource/grouped_light": authorized((s) => json(s, 200, resources(fixtures.groupedLights))),
    "GET /clip/v2/resource/room": authorized((s) => json(s, 200, resources(fixtures.rooms))),
    "GET /clip/v2/resource/zone": authorized((s) => json(s, 200, resources(fixtures.zones))),
    "GET /clip/v2/resource/scene": authorized((s) => json(s, 200, resources(fixtures.scenes))),
    "GET /clip/v2/resource/zigbee_connectivity": authorized((s) =>
      json(s, 200, resources(fixtures.zigbeeConnectivity)),
    ),
    "PUT /clip/v2/resource/": authorized((s, _, h) => {
      const [rtype, rid] = String(h[":path"]).split("/").slice(-2);
      json(s, 200, resources([{ rid, rtype }]));
    }),
    "POST /api": (s) => json(s, 200, [{ success: { username: USERNAME, clientkey: "test-clientkey" } }]),
    "GET /eventstream/clip/v2": authorized((s) => {
      s.respond({ ":status": 200, "content-type": "text/event-stream" });
      s.write(": hi\n\n");
    }),
  };

  server.on("session", (session) => {
    sessions.push(session);
    session.on("error", () => {});
    if (ignoreGoaway) session.close = () => {};
  });

  server.on("stream", async (stream, headers) => {
    stream.on("error", () => {});
    const method = String(headers[":method"]);
    const path = String(headers[":path"]);
    const isEventStream = path === "/eventstream/clip/v2";
    if (isEventStream) eventStreams.push(stream);
    else {
      inFlight++;
      bridge.maxInFlight = Math.max(bridge.maxInFlight, inFlight);
      stream.once("close", () => inFlight--);
    }
    let body = "";
    for await (const chunk of stream) body += chunk;
    requests.push({
      method,
      path,
      headers,
      body,
      session: sessions.indexOf(stream.session as http2.ServerHttp2Session),
    });
    const key = `${method} ${path}`;
    const route = Object.entries(routes)
      .filter(([prefix]) => key.startsWith(prefix))
      .sort(([a], [b]) => b.length - a.length)[0]?.[1];
    if (route) route(stream, body, headers);
    else json(stream, 404, { errors: [{ description: `Not found: ${key}` }], data: [] });
  });

  const address = await listen(server);

  const bridge = {
    address,
    config: { ipAddress: address, id: BRIDGE_ID, username: USERNAME } as BridgeConfig,
    routes,
    requests,
    sessions,
    eventStreams,
    maxInFlight: 0,
    // Writes raw text or bytes to the open event streams.
    write: (chunk: string | Uint8Array) => eventStreams.forEach((stream) => stream.write(chunk)),
    // Sends events as one data line, like the bridge.
    sendEvents: (events: Partial<HueEvent>[]) => bridge.write(`id: 1:0\ndata: ${JSON.stringify(events)}\n\n`),
    close: () =>
      new Promise<void>((resolve) => {
        sessions.forEach((session) => session.destroy());
        server.close(() => resolve());
      }),
  };
  servers.push(bridge);
  return bridge;
}

export type FakeBridge = Awaited<ReturnType<typeof startBridge>>;

export const puts = (bridge: FakeBridge) =>
  bridge.requests.filter(({ method }) => method === "PUT").map(({ path, body }) => ({ path, body: JSON.parse(body) }));

// Accepts TCP connections and never answers the TLS handshake, like a host that went to sleep mid-connection.
export async function startSilentServer() {
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
  });
  const address = await listen(server);
  servers.push({
    close: () =>
      new Promise<void>((resolve) => {
        sockets.forEach((socket) => socket.destroy());
        server.close(() => resolve());
      }),
  });
  return address;
}

// An address nothing listens on, which refuses connections at once.
export async function closedAddress() {
  const server = net.createServer();
  const address = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return address;
}
