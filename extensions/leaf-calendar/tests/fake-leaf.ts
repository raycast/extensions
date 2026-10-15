import net from "node:net";

type Handler = (params: Record<string, unknown>) => unknown;

export type FakeLeaf = {
  path: string;
  received: { method: string; params: Record<string, unknown>; raw: string }[];
  close: () => Promise<void>;
};

/** Thrown from a handler to answer with a JSON-RPC error, as Leaf Calendar does. */
export class RpcFailure {
  constructor(
    readonly code: number,
    readonly message: string,
    readonly dataCode?: string,
    readonly closeAfter = false,
  ) {}
}

let counter = 0;

/**
 * A stand-in for Leaf Calendar's pipe server: one JSON-RPC message per line, answered in order. Handlers return a result,
 * throw `RpcFailure`, or return `SILENT` to never answer.
 */
export const SILENT = Symbol("silent");

export async function startFakeLeaf(handlers: Record<string, Handler>): Promise<FakeLeaf> {
  const path = `\\\\.\\pipe\\leaf-calendar-test-${process.pid}-${++counter}`;
  const received: FakeLeaf["received"] = [];
  const sockets = new Set<net.Socket>();

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const raw = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const request = JSON.parse(raw);
        received.push({ method: request.method, params: request.params, raw });
        reply(socket, request);
      }
    });
  });

  function reply(socket: net.Socket, request: { id: number; method: string; params: Record<string, unknown> }) {
    const handler = handlers[request.method];
    if (!handler) {
      socket.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Unknown method." } }) + "\n");
      return;
    }

    try {
      const result = handler(request.params);
      if (result !== SILENT) {
        socket.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }) + "\n");
      }
    } catch (failure) {
      if (!(failure instanceof RpcFailure)) {
        throw failure;
      }

      const error = {
        code: failure.code,
        message: failure.message,
        ...(failure.dataCode ? { data: { code: failure.dataCode } } : {}),
      };
      socket.write(JSON.stringify({ jsonrpc: "2.0", id: request.id, error }) + "\n");
      if (failure.closeAfter) {
        socket.end();
      }
    }
  }

  await new Promise<void>((resolve) => server.listen(path, resolve));

  return {
    path,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        sockets.forEach((socket) => socket.destroy());
        server.close(() => resolve());
      }),
  };
}

export const HELLO = { leafVersion: "0.1.308", apiVersion: 1, profile: "default" };
