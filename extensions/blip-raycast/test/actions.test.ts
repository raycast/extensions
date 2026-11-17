import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sendLocations } from "../src/lib/actions";
import type { BlipClient } from "../src/lib/client";
import { DrpcTimeoutError } from "../src/lib/drpc";
import type { BlipState, Transfer } from "../src/lib/types";

const file = join(mkdtempSync(join(tmpdir(), "blip-actions-")), "a.txt");
writeFileSync(file, "hello");
const peer = { user_id: "me", device_id: "pc" };
const timeout = () => new DrpcTimeoutError("/rpc.Service/Dispatch");

interface Script {
  /** Events that fail, and how. */
  fail?: Record<string, Error>;
  /** The transfer Blip reports, or undefined if it never created one. */
  transfer?: Partial<Transfer>;
  /** GetState fails (e.g. Blip quit right after the invite). */
  stateFails?: boolean;
}

/** A stand-in for Blip: records dispatches and reports the scripted transfer. */
function fakeClient({ fail = {}, transfer, stateFails }: Script = {}) {
  const calls: string[] = [];
  const client = {
    async dispatch(event: string) {
      calls.push(event.replace("event.Transfer", ""));
      if (fail[event]) throw fail[event];
    },
    async getState() {
      if (stateFails) throw new Error("Blip is quitting.");
      const transfers = transfer ? { [transfer.transfer_id ?? "id"]: transfer } : {};
      return { id: String(calls.length), state: { version: 1, transfers } as unknown as BlipState };
    },
  };
  return { client: client as unknown as BlipClient, calls };
}

const send = (client: BlipClient) => sendLocations(peer, [file], { client, transferId: "id" });

test("a send is create, add, invite, then dismiss so Blip's window never shows", async () => {
  const { client, calls } = fakeClient({ transfer: { status: 2 } });
  await send(client);
  assert.deepEqual(calls, ["CreateRequested", "AddContentRequested", "InviteRequested", "Dismiss"]);
});

test("a failed step removes the half-built transfer", async () => {
  const { client, calls } = fakeClient({ fail: { "event.TransferAddContentRequested": new Error("boom") } });
  await assert.rejects(send(client), /boom/);
  assert.deepEqual(calls, ["CreateRequested", "AddContentRequested", "RemoveRequested", "Dismiss"]);
});

test("a timeout before Blip created anything reports that nothing was sent, and still dismisses", async () => {
  const { client, calls } = fakeClient({ fail: { "event.TransferCreateRequested": timeout() } });
  await assert.rejects(send(client), /nothing was sent/);
  assert.equal(calls.includes("InviteRequested"), false);
  assert.equal(calls.at(-1), "Dismiss");
});

test("a timeout after Blip added the files finishes the send with the invite", async () => {
  const { client, calls } = fakeClient({
    fail: { "event.TransferAddContentRequested": timeout() },
    transfer: { status: 1, archive_stub: { items: { "a.txt": {} }, disk_locations: {} } },
  });
  await send(client);
  assert.deepEqual(calls, ["CreateRequested", "AddContentRequested", "InviteRequested", "Dismiss"]);
});

test("a timeout before the files were added undoes the transfer", async () => {
  const { client, calls } = fakeClient({
    fail: { "event.TransferAddContentRequested": timeout() },
    transfer: { status: 1, archive_stub: { items: {}, disk_locations: {} } },
  });
  await assert.rejects(send(client), /nothing was sent/);
  assert.ok(calls.includes("RemoveRequested"));
});

test("a timed-out invite that Blip did act on counts as sent, without inviting twice", async () => {
  const { client, calls } = fakeClient({ fail: { "event.TransferInviteRequested": timeout() }, transfer: { status: 2 } });
  await send(client);
  assert.equal(calls.filter((call) => call === "InviteRequested").length, 1);
  assert.equal(calls.includes("RemoveRequested"), false);
});

test("once the invite is out, an unreachable Blip isn't reported as a failed send", async () => {
  const { client } = fakeClient({ stateFails: true });
  await send(client);
});

test("a failure Blip reports right after the invite is surfaced", async () => {
  const { client } = fakeClient({
    transfer: { status: 9, local_err: { code: 12, msg: "can't read a.txt", action_required: false, fatal: true } },
  });
  await assert.rejects(send(client), /can't read a\.txt/);
});

test("missing files are caught before anything is sent", async () => {
  const { client, calls } = fakeClient();
  await assert.rejects(sendLocations(peer, ["/no/such/file"], { client }), /Not found/);
  assert.deepEqual(calls, []);
});
