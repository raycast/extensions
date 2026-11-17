/**
 * Read-only checks against the real Blip on this machine. Skipped unless BLIP_LIVE=1.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { BlipClient } from "../src/lib/client";
import { DrpcTimeoutError } from "../src/lib/drpc";
import { listRecipients, listTransfers } from "../src/lib/model";

const live = process.env.BLIP_LIVE === "1";

test("reads live state through the TypeScript client", { skip: !live }, async () => {
  const client = new BlipClient();
  const { id, state } = await client.getState();
  assert.ok(id);
  assert.equal(state.version, 1);
  assert.ok(state.auth?.user_id);
  assert.equal((state.auth as Record<string, unknown>).token, undefined, "token must never be decoded");
  const recipients = listRecipients(state);
  console.log("recipients:", recipients.map((r) => `${r.name} (${r.kind}, ${r.isOnline ? "online" : "offline"})`));
  console.log("transfers:", listTransfers(state).map((t) => `${t.title} → ${t.statusLabel}`).slice(0, 5));
  assert.ok(recipients.length > 0);
});

test("long-poll waits while nothing changes", { skip: !live }, async () => {
  const client = new BlipClient();
  const { id } = await client.getState();
  await assert.rejects(client.getState({ lastId: id, timeoutMs: 1500 }), DrpcTimeoutError);
});

test("dispatch of a harmless event is accepted", { skip: !live }, async () => {
  await new BlipClient().dispatch("event.TransferDismiss", { transfer_id: "00000000-0000-0000-0000-000000000000" });
});
