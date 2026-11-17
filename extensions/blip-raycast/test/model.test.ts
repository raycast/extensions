import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRecipients, listTransfers } from "../src/lib/model";
import { cleanOutbox, textFileName } from "../src/lib/outbox";
import { encodeEvent, encode, decode } from "../src/lib/schema";
import type { BlipState } from "../src/lib/types";

test("text file names follow Blip's own Paste naming", () => {
  assert.equal(textFileName("hello world"), "hello world.txt");
  assert.equal(textFileName(`<meta charset='utf-8'><span style="x">`), `-meta charset='utf-8'--span style=-x--.txt`);
  assert.equal(textFileName("a\nb\tc"), "a b c.txt");
  assert.equal(textFileName("   "), "Text.txt");
  assert.equal(textFileName("x".repeat(500)).length, 128 + 4);
});

test("events are wrapped in google.protobuf.Any with Blip's type URL", () => {
  const any = decode<{ type_url: string; value: Buffer }>(
    "google.protobuf.Any",
    encodeEvent("event.TransferDismiss", { transfer_id: "ABC" }),
  );
  assert.equal(any.type_url, "type.googleapis.com/event.TransferDismiss");
  assert.deepEqual(decode("event.TransferDismiss", any.value), { transfer_id: "ABC" });
});

const state = {
  version: 1,
  auth: { user_id: "me", device_id: "mac", email: "" },
  users: {
    discovered: {
      me: {
        user_id: "me", email: "", name: "Me", is_contact: false, is_self: true, is_searchable: false,
        devices: {
          mac: { device_id: "mac", kind: 4, name: "My Mac", is_self: true, reach: { is_online: true, is_pushable: true } },
          pc: { device_id: "pc", kind: 5, name: "Windows PC", is_self: false, reach: { is_online: true, is_pushable: true } },
          phone: { device_id: "phone", kind: 2, name: "Phone", is_self: false, reach: { is_online: false, is_pushable: true } },
        },
      },
      stranger: { user_id: "stranger", email: "s@x", name: "Stranger", is_contact: false, is_self: false, is_searchable: true, devices: {} },
    },
    contacts: {
      friend: { user_id: "friend", email: "f@x", name: "Friend", is_contact: true, is_self: false, is_searchable: true, devices: { d: { device_id: "d", kind: 2, name: "", is_self: false, reach: { is_online: true, is_pushable: true } } } },
    },
    recent_interactions: [{ peer_id: { user_id: "me", device_id: "phone" }, time: { seconds: "100", nanos: 0 }, initiated_by_peer: false }],
  },
  transfers: {
    T1: {
      transfer_id: "T1", peer_id: { user_id: "me", device_id: "pc" }, direction: 2, status: 5, progress: "50",
      archive_stub: { items: { "a.txt": { file: { size: "100", mod_time_ms: "0", is_executable: false } } }, disk_locations: { "a.txt": "/tmp/a.txt" } },
      destination_location: "", is_resumable: true, is_dismissed: true,
    },
    T2: {
      transfer_id: "T2", peer_id: { user_id: "friend", device_id: "d" }, direction: 1, status: 3, progress: "0",
      archive_stub: { items: {}, disk_locations: {} }, destination_location: "", is_resumable: false, is_dismissed: false,
    },
  },
  searches: {},
} as unknown as BlipState;

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
});

test("outbox cleanup keeps folders for unfinished transfers", () => {
  const support = mkdtempSync(join(tmpdir(), "blip-outbox-"));
  for (const id of ["T1", "GONE"]) {
    mkdirSync(join(support, "outbox", id), { recursive: true });
    const old = new Date(Date.now() - 60 * 60 * 1000);
    utimesSync(join(support, "outbox", id), old, old);
  }
  cleanOutbox(support, state);
  assert.equal(existsSync(join(support, "outbox", "T1")), true);
  assert.equal(existsSync(join(support, "outbox", "GONE")), false);
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
        transfer_id: "P", peer_id: { user_id: "me", device_id: "pc" }, direction: 2, status: 6, progress: "1",
        archive_stub: { items: {}, disk_locations: {} }, destination_location: "", is_resumable: true, is_dismissed: true,
        local_err: { code: 403, msg: "awaiting copy done: user paused", action_required: false, fatal: false },
      },
    },
  } as unknown as BlipState;
  const row = listTransfers(paused)[0];
  assert.equal(row.statusLabel, "Paused");
  assert.equal(row.errorMessage, undefined);
  assert.equal(row.canResume, true);
});
