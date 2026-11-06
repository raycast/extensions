import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { WebSocketServer } from "ws";
import { decodeInventory, inspectModel, validatePort } from "../src/lib/bridge";

const uint = (value: number) => { const bytes = Buffer.alloc(4); bytes.writeUInt32LE(value); return bytes; };
const int = (value: number) => { const bytes = Buffer.alloc(4); bytes.writeInt32LE(value); return bytes; };
const text = (value: string) => {
  const bytes = Buffer.from(value);
  return Buffer.concat([uint(bytes.length), bytes, Buffer.alloc((4 - bytes.length % 4) % 4)]);
};
function inventory(scope: "all" | "visible" = "all", status = 200) {
  // Format matches official client.py: ADD header, count, type, IDs, flags, padded UTF-8 name, arrays.
  const group = Buffer.concat([uint(5), uint(8), uint(1), int(-1), int(-1), uint(0), text("Assembly")]);
  const solid = Buffer.concat([
    uint(0), uint(9), uint(3), int(8), int(-1), uint(0), text("Bracket 🔩"),
    uint(3), Buffer.alloc(3 * 12), uint(1), Buffer.alloc(12), uint(3), Buffer.alloc(3 * 12),
    uint(1), uint(0), uint(1), uint(22),
  ]);
  const add = Buffer.concat([uint(1), uint(2), group, solid]);
  return Buffer.concat([uint(scope === "all" ? 20 : 22), uint(1), uint(status), text("fixture.plasticity"), uint(4), uint(1), uint(add.length), add]);
}
test("rejects inventory replies for another request ID", () => {
  assert.throws(() => decodeInventory(inventory(), 6, "all"), /Unexpected/);
});

test("decodes group hierarchy, signed parent, padded UTF-8 names, and mesh counts", () => {
  const model = decodeInventory(inventory(), 1, "all");
  assert.equal(model.filename, "fixture.plasticity");
  assert.equal(model.version, 4);
  assert.equal(model.objects.length, 2);
  assert.equal(model.objects[0].parentId, -1);
  assert.equal(model.objects[1].name, "Bracket 🔩");
  assert.equal(model.objects[1].parentId, 8);
  assert.equal(model.objects[1].vertices, 3);
  assert.equal(model.objects[1].triangles, 1);
});

test("visible inventory is a distinct request and failed/truncated replies are rejected", () => {
  assert.equal(decodeInventory(inventory("visible"), 1, "visible").scope, "visible");
  assert.throws(() => decodeInventory(inventory("all", 403), 1, "all"), /403/);
  assert.throws(() => decodeInventory(inventory().subarray(0, -5), 1, "all"), /truncated/);
  assert.throws(() => decodeInventory(inventory("all"), 1, "visible"), /Unexpected/);
});

test("rejects invalid bridge ports and accepts the documented default", () => {
  assert.equal(validatePort("8980"), 8980);
  for (const value of ["0", "65536", "8980/path", "host:8980", "-1", "Infinity", ""]) {
    assert.throws(() => validatePort(value), /Bridge Port/);
  }
});

test("rejects trailing bytes in ADD records and the outer snapshot", () => {
  assert.throws(() => decodeInventory(Buffer.concat([inventory(), uint(123)]), 1, "all"), /trailing/);
  const snapshot = inventory();
  const addLengthOffset = 12 + text("fixture.plasticity").length + 8;
  snapshot.writeUInt32LE(snapshot.readUInt32LE(addLengthOffset) + 4, addLengthOffset);
  assert.throws(() => decodeInventory(Buffer.concat([snapshot, uint(123)]), 1, "all"), /trailing/);
});

test("real WebSocket client sends only direct read-only list requests for both scopes", async () => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address() as { port: number };
  const messages: number[] = [];
  server.on("connection", (socket) => {
    socket.on("message", (data) => {
      const bytes = Buffer.from(data as Buffer);
      const type = bytes.readUInt32LE(0);
      messages.push(type);
      assert.equal(bytes.length, 8);
      assert.equal(bytes.readUInt32LE(4), 1);
      assert.ok(type === 20 || type === 22);
      // Legacy and current official clients both publish this direct LIST protocol.
      socket.send(inventory(type === 20 ? "all" : "visible"));
    });
  });
  try {
    for (const scope of ["all", "visible"] as const) {
      const model = await inspectModel(address.port, scope);
      assert.equal(model.objects[1].name, "Bracket 🔩");
      assert.equal(model.scope, scope);
    }
    assert.deepEqual(messages, [20, 22]);
  } finally {
    for (const client of server.clients) client.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("cancelling closes the connection without sending geometry or mutation messages", async () => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address() as { port: number };
  const controller = new AbortController();
  server.on("connection", (socket) => { socket.on("message", () => controller.abort()); });
  try {
    await assert.rejects(inspectModel(address.port, "all", controller.signal), /cancelled/);
  } finally {
    for (const client of server.clients) client.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
