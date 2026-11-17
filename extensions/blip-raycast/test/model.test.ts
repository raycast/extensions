import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, existsSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRecipients, listTransfers, recipientExists, transferError } from "../src/lib/model";
import { cleanOutbox, markStaged, textFileName } from "../src/lib/outbox";
import { encodeEvent, encode, decode } from "../src/lib/schema";
import type { BlipState } from "../src/lib/types";

test("text file names follow Blip's own Paste naming", () => {
  assert.equal(textFileName("hello world"), "hello world.txt");
  assert.equal(textFileName(`<meta charset='utf-8'><span style="x">`), `-meta charset='utf-8'--span style=-x--.txt`);
  assert.equal(textFileName("a\nb\tc"), "a b c.txt");
  assert.equal(textFileName("   "), "Text.txt");
  assert.equal(textFileName("x".repeat(500)).length, 128 + 4);
  // Never cut an emoji in half, and never produce a Windows device name.
  assert.equal(textFileName("x".repeat(127) + "😀😀"), "x".repeat(127) + "😀.txt");
  assert.equal(textFileName("con"), "con (text).txt");
  assert.ok(textFileName("🔥".repeat(200)).length <= 255);
});

test("events are wrapped in google.protobuf.Any with Blip's type URL", () => {
  const any = decode<{ type_url: string; value: Buffer }>(
    "google.protobuf.Any",
    encodeEvent("event.TransferDismiss", { transfer_id: "ABC" }),
  );
  assert.equal(any.type_url, "type.googleapis.com/event.TransferDismiss");
  assert.deepEqual(decode("event.TransferDismiss", any.value), { transfer_id: "ABC" });
});

// Built by encoding through Blip's real schema and decoding again, so the shape matches what Blip sends.
const state = decode<BlipState>(
  "frontend.State",
  encode("frontend.State", {
    version: 1,
    auth: { user_id: "me", device_id: "mac", email: "" },
    users: {
      discovered: {
        me: {
          user_id: "me", name: "Me", is_self: true,
          devices: {
            mac: { device_id: "mac", kind: 4, name: "My Mac", is_self: true, reach: { is_online: true } },
            pc: { device_id: "pc", kind: 5, name: "Windows PC", reach: { is_online: true } },
            phone: { device_id: "phone", kind: 2, name: "Phone", reach: { is_online: false } },
          },
        },
        // A contact Blip only lists in `users.contacts` (no is_contact flag on the user).
        friend: { user_id: "friend", email: "f@x", name: "Friend", devices: { d: { device_id: "d", kind: 2, reach: { is_online: true } } } },
        stranger: { user_id: "stranger", email: "s@x", name: "Stranger", is_searchable: true },
      },
      contacts: { friend: true },
      recent_interactions: [{ peer_id: { user_id: "me", device_id: "phone" }, time: { seconds: 100 } }],
    },
    transfers: {
      T1: {
        transfer_id: "T1", peer_id: { user_id: "me", device_id: "pc" }, direction: 2, status: 5, progress: 50, is_resumable: true,
        archive_stub: {
          items: { "b.txt": { file: { size: 60 } }, "a.txt": { file: { size: 40 } } },
          disk_locations: { "b.txt": "/tmp/b.txt", "a.txt": "/tmp/a.txt" },
        },
      },
      T2: { transfer_id: "T2", peer_id: { user_id: "friend", device_id: "d" }, direction: 1, status: 3 },
    },
  }),
);

test("recipients: own devices (not this Mac) first, recent first; contacts addressed by user only", () => {
  const recipients = listRecipients(state);
  assert.deepEqual(recipients.map((r) => r.name), ["Phone", "Windows PC", "Friend"]);
  assert.deepEqual(recipients[1].peerId, { user_id: "me", device_id: "pc" });
  assert.deepEqual(recipients[2].peerId, { user_id: "friend", device_id: "" });
  assert.equal(recipients.find((r) => r.name === "Stranger"), undefined);
});

test("transfer rows: progress, labels, and incoming invites first", () => {
  const rows = listTransfers(state);
  assert.equal(rows[0].id, "T2");
  assert.equal(rows[0].needsResponse, true);
  assert.equal(rows[0].peerName, "Friend");
  const t1 = rows.find((r) => r.id === "T1")!;
  assert.equal(t1.statusLabel, "Sending");
  assert.equal(t1.fraction, 0.5);
  assert.equal(t1.peerName, "Windows PC");
  assert.equal(t1.canPause, true);
  // Map order isn't fixed on the wire, so items are sorted for a stable title and paths.
  assert.equal(t1.title, "a.txt + 1 more");
  assert.deepEqual(t1.localPaths, ["/tmp/a.txt", "/tmp/b.txt"]);
});

test("a remembered recipient is still valid only while its device or person exists", () => {
  assert.equal(recipientExists(state, { user_id: "me", device_id: "pc" }), true);
  assert.equal(recipientExists(state, { user_id: "me", device_id: "old-laptop" }), false);
  assert.equal(recipientExists(state, { user_id: "friend", device_id: "" }), true);
  assert.equal(recipientExists(state, { user_id: "nobody", device_id: "" }), false);
});

test("transfer errors: failures that stopped a transfer are reported; user actions and retries are not", () => {
  const base = state.transfers.T1; // Active
  const err = (code: number, msg: string, fatal = true, status = base.status) =>
    transferError({ ...base, status, local_err: { code, msg, action_required: false, fatal } });
  assert.equal(err(403, "user paused"), undefined);
  assert.equal(err(400, "user canceled"), undefined);
  assert.equal(err(17, "no permission"), "no permission");
  assert.equal(err(17, ""), "Blip error 17");
  // A dropped connection Blip is retrying isn't a failure, unless the transfer ended because of it.
  assert.equal(err(300, "connection lost", false), undefined);
  assert.equal(err(300, "connection lost", false, 9), "connection lost");
  assert.equal(transferError(base), undefined);
});

test("outbox cleanup removes only what no transfer still needs", () => {
  const support = mkdtempSync(join(tmpdir(), "blip-outbox-"));
  const age = (path: string, minutes: number) => {
    const time = new Date(Date.now() - minutes * 60 * 1000);
    utimesSync(path, time, time);
  };
  const statuses = { ACTIVE: 5, PAUSED: 6, INVITED: 3, STUCK: 1, DONE: 8, CANCELED: 9 };
  const withTransfers = decode<BlipState>(
    "frontend.State",
    encode("frontend.State", {
      version: 1,
      transfers: Object.fromEntries(Object.entries(statuses).map(([id, status]) => [id, { transfer_id: id, status }])),
    }),
  );
  for (const id of [...Object.keys(statuses), "GONE", "NEW"]) {
    const dir = join(support, "outbox", id);
    mkdirSync(dir, { recursive: true });
    age(dir, id === "NEW" ? 1 : 60);
  }
  const staging = join(support, "outbox", "staging");
  mkdirSync(staging, { recursive: true });
  for (const [name, minutes] of [["two-days.png", 48 * 60], ["an-hour.png", 60], ["in-use.png", 48 * 60]] as const) {
    writeFileSync(join(staging, name), "x");
    age(join(staging, name), minutes);
  }
  markStaged(join(staging, "in-use.png"));

  cleanOutbox(support, withTransfers);
  const kept = (id: string) => existsSync(join(support, "outbox", id));
  // Still sending or waiting: keep. Finished, gone, or stuck before it ever started: remove.
  assert.deepEqual(
    ["ACTIVE", "PAUSED", "INVITED", "NEW", "STUCK", "DONE", "CANCELED", "GONE"].map(kept),
    [true, true, true, true, false, false, false, false],
  );
  assert.equal(existsSync(join(staging, "two-days.png")), false);
  assert.equal(existsSync(join(staging, "an-hour.png")), true);
  assert.equal(existsSync(join(staging, "in-use.png")), true);
});

test("outbox cleanup does nothing to transfer folders while Blip hasn't loaded its history", () => {
  const support = mkdtempSync(join(tmpdir(), "blip-outbox-"));
  const dir = join(support, "outbox", "SENDING");
  mkdirSync(dir, { recursive: true });
  const old = new Date(Date.now() - 60 * 60 * 1000);
  utimesSync(dir, old, old);
  cleanOutbox(support, { version: 1, transfers: {}, searches: {} } as BlipState);
  assert.equal(existsSync(dir), true);
});

test("fields Blip leaves out decode as zero, not as the enum's first-listed value", () => {
  const err = decode<{ code: number }>("frontend.TransferErr", new Uint8Array());
  const transfer = decode<{ status: number; direction: number }>("frontend.Transfer", new Uint8Array());
  assert.equal(err.code, 0);
  assert.equal(transfer.status, 0);
  assert.equal(transfer.direction, 0);
  // An empty error (code 0, no message) must not count as a failure.
  assert.equal(transferError({ ...state.transfers.T1, local_err: { code: 0, msg: "", action_required: false, fatal: false } }), undefined);
});

test("64-bit ids survive a round trip without losing precision", () => {
  const id = "15522614308793132041"; // larger than Number.MAX_SAFE_INTEGER
  const bytes = encode("rpc.StateRequest", { last_rcvd: id });
  assert.equal(decode<{ last_rcvd: string }>("rpc.StateRequest", bytes).last_rcvd, id);
});

test("user-initiated pauses are not shown as errors", () => {
  const paused = {
    ...state,
    transfers: {
      P: {
        ...state.transfers.T1,
        transfer_id: "P",
        status: 6,
        local_err: { code: 403, msg: "awaiting copy done: user paused", action_required: false, fatal: false },
      },
    },
  } as BlipState;
  const row = listTransfers(paused)[0];
  assert.equal(row.statusLabel, "Paused");
  assert.equal(row.errorMessage, undefined);
  assert.equal(row.canResume, true);
});
