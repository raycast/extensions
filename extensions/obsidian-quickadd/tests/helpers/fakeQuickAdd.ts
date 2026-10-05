import { createServer, IncomingMessage } from "http";
import { AddressInfo } from "net";

export interface FakeQuickAdd {
  port: number;
  session: string;
  token: string;
  replies: unknown[];
  aborts: number;
  push(event: object): void;
  onReply?: (body: { requestId: string; value: unknown }) => void;
  failNextPoll?: { status: number; body: object };
  rawNextPoll?: string;
  replyFailure?: { status: number; body: object };
  close(): Promise<void>;
}

async function readBody(req: IncomingMessage): Promise<string> {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data;
}

/** In-process stand-in for QuickAdd's interactive server (protocol from the CLI spike). */
export async function startFakeQuickAdd(): Promise<FakeQuickAdd> {
  const queue: object[] = [];
  const fake = {
    port: 0,
    session: "s1",
    token: "t1",
    replies: [] as unknown[],
    aborts: 0,
    push: (event: object) => queue.push(event),
  } as FakeQuickAdd;

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const send = (status: number, body: object) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (url.searchParams.get("session") !== fake.session || url.searchParams.get("token") !== fake.token) {
      send(404, { ok: false, error: "Unknown session or token" });
      return;
    }
    if (req.method === "GET" && url.pathname === "/poll") {
      if (fake.rawNextPoll !== undefined) {
        const raw = fake.rawNextPoll;
        fake.rawNextPoll = undefined;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(raw);
        return;
      }
      if (fake.failNextPoll) {
        const failure = fake.failNextPoll;
        fake.failNextPoll = undefined;
        send(failure.status, failure.body);
        return;
      }
      send(200, queue.shift() ?? { kind: "idle" });
      return;
    }
    if (req.method === "POST" && url.pathname === "/reply") {
      const body = JSON.parse(await readBody(req));
      if (fake.replyFailure) {
        send(fake.replyFailure.status, fake.replyFailure.body);
        return;
      }
      fake.replies.push(body);
      fake.onReply?.(body);
      send(200, { ok: true });
      return;
    }
    if (req.method === "POST" && url.pathname === "/abort") {
      await readBody(req);
      fake.aborts++;
      queue.push({ kind: "error", error: "Execution cancelled by user" });
      send(200, { ok: true, interrupted: 1 });
      return;
    }
    send(404, { ok: false, error: "Not found" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  fake.port = (server.address() as AddressInfo).port;
  fake.close = () =>
    new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  return fake;
}
