import assert from "node:assert/strict";
import { test } from "node:test";
import { restoreDroppedShow } from "../lib/media-mutations";

type Reply = { status: number; body: { deleted: { shows?: number } } };

/** A client answering the two restore calls with the given replies, recording which ones ran. */
function fakeClient(dropped: Reply, calendar: Reply) {
  const calls: string[] = [];
  const client = {
    shows: {
      restoreDroppedShow: async () => (calls.push("dropped"), dropped),
      unhideShowFromCalendar: async () => (calls.push("calendar"), calendar),
    },
  };
  return { client: client as unknown as Parameters<typeof restoreDroppedShow>[0], calls };
}

const removed = (shows: number): Reply => ({ status: 200, body: { deleted: { shows } } });

test("a dropped show is restored and put back on the calendar", async () => {
  const { client, calls } = fakeClient(removed(1), removed(1));
  assert.deepEqual(await restoreDroppedShow(client, 1, {}), { calendarRestored: true });
  assert.deepEqual(calls, ["dropped", "calendar"]);
});

test("a retry after a failed calendar step finishes the restore", async () => {
  const { client } = fakeClient(removed(0), removed(1));
  assert.deepEqual(await restoreDroppedShow(client, 1, {}), { calendarRestored: true });
});

test("a show neither dropped nor hidden from the calendar is reported as not restored", async () => {
  const { client } = fakeClient(removed(0), removed(0));
  await assert.rejects(restoreDroppedShow(client, 1, {}), /did not restore/);
});

test("a failed calendar step after a restore is reported, not thrown", async () => {
  const { client } = fakeClient(removed(1), { status: 500, body: { deleted: {} } });
  assert.deepEqual(await restoreDroppedShow(client, 1, {}), { calendarRestored: false });
});

test("a failed dropped-list request stops before the calendar step", async () => {
  const { client, calls } = fakeClient({ status: 500, body: { deleted: {} } }, removed(1));
  await assert.rejects(restoreDroppedShow(client, 1, {}), /did not restore/);
  assert.deepEqual(calls, ["dropped"]);
});
