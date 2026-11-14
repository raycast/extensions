import test from "node:test";
import assert from "node:assert/strict";
import { createEntry, DEFAULT_CARDS, summarizeWeek } from "daily-karte";
import { FirestoreClient, encodeFields, decodeDocument } from "../src/lib/firestore";
import { ServiceError, requestJSON } from "../src/lib/http";
import type { Session } from "../src/types";

const session: Session = {
  config: {
    projectId: "demo-daily-karte",
    clientId: "test-client",
    website: "https://demo-daily-karte.web.app",
  },
  uid: "test-user",
  email: "test@example.invalid",
  idToken: "test-session",
  expiresAt: Date.now() + 3600000,
};
const prefix = "projects/demo-daily-karte/databases/(default)/documents/users/test-user";
const card = DEFAULT_CARDS.find((value) => value.id === "reading")!;
const first = createEntry(card, {
  now: new Date(2026, 10, 13, 10).getTime(),
  duration: 30,
});
const incoming = createEntry(card, {
  now: first.end + 30 * 60000,
  duration: 30,
});
const doc = (entry = first) => ({
  name: `${prefix}/entries/${entry.id}`,
  fields: encodeFields(entry),
  updateTime: "2026-11-14T00:00:00.123456Z",
});
interface RequestBody {
  documents?: string[];
  transaction?: string;
  writes: {
    update: ReturnType<typeof doc>;
    currentDocument: { exists?: boolean; updateTime?: string };
    delete?: string;
  }[];
  structuredQuery: {
    where: {
      compositeFilter: {
        filters: { fieldFilter: { value: { integerValue: string } } }[];
      };
    };
  };
}
function harness(handler: (url: string, body: RequestBody) => unknown) {
  const calls: { url: string; body: RequestBody }[] = [];
  const request = (async (url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body)) as RequestBody;
    calls.push({ url, body });
    if (url.endsWith(":beginTransaction") || url.endsWith(":rollback")) {
      throw new ServiceError("PERMISSION_DENIED");
    }
    assert.equal((options.headers as Record<string, string>).Authorization, "Bearer test-session");
    return await handler(url, body);
  }) as typeof requestJSON;
  return { client: new FirestoreClient(session, request), calls };
}

test("Cloud records round-trip and reject cross-account paths and malformed values.", () => {
  assert.deepEqual(decodeDocument(doc(), prefix, "entries"), first);
  assert.throws(
    () => decodeDocument({ ...doc(), name: doc().name.replace("test-user", "other-user") }, prefix, "entries"),
    /invalid path/,
  );
  assert.throws(
    () =>
      decodeDocument(
        {
          ...doc(),
          fields: {
            ...doc().fields,
            duration: { integerValue: "9007199254740993" },
          },
        },
        prefix,
        "entries",
      ),
    /unsupported value/,
  );
  assert.throws(
    () =>
      decodeDocument(
        {
          ...doc(),
          fields: {
            ...doc().fields,
            note: { stringValue: "ok", nullValue: null },
          },
        },
        prefix,
        "entries",
      ),
    /invalid format/,
  );
  assert.throws(
    () =>
      decodeDocument(
        {
          ...doc(),
          fields: { ...doc().fields, id: { stringValue: "wrong-id" } },
        },
        prefix,
        "entries",
      ),
    /validation/,
  );
});

test("Firebase user saves use a conditional atomic commit without requesting a server transaction.", async () => {
  const h = harness((url) => (url.endsWith(":runQuery") ? [] : {}));
  await h.client.record(incoming);
  assert.deepEqual(
    h.calls.map((call) => call.url.split(":").at(-1)),
    ["runQuery", "commit"],
  );
  assert.equal(h.calls[1].body.transaction, undefined);
  assert.deepEqual(h.calls[1].body.writes[0].currentDocument, {
    exists: false,
  });
});

test("A merge atomically creates the result and deletes only the version of the neighbor that was read.", async () => {
  const h = harness((url) => (url.endsWith(":runQuery") ? [{ document: doc() }] : {}));
  const result = await h.client.record(incoming);
  assert.equal(result.merged, true);
  assert.equal(result.entry.duration, 60);
  const commit = h.calls.find((call) => call.url.endsWith(":commit"))!.body;
  assert.equal(commit.writes.length, 2);
  assert.deepEqual(decodeDocument(commit.writes[0].update, prefix, "entries"), result.entry);
  assert.equal(commit.writes[1].delete, doc().name);
  assert.deepEqual(commit.writes[1].currentDocument, {
    updateTime: doc().updateTime,
  });
});

test("A version conflict re-reads records before deciding whether to merge.", async () => {
  for (const code of ["ABORTED", "FAILED_PRECONDITION"]) {
    let reads = 0;
    let commits = 0;
    const blocker = createEntry(DEFAULT_CARDS[0], {
      now: first.end + 20 * 60000,
      duration: 10,
    });
    const h = harness((url) => {
      if (url.endsWith(":runQuery"))
        return [first, ...(++reads > 1 ? [blocker] : [])].map((entry) => ({
          document: doc(entry),
        }));
      if (url.endsWith(":commit") && ++commits === 1) throw new ServiceError(code);
      return {};
    });
    const result = await h.client.record(incoming);
    assert.equal(reads, 2);
    assert.equal(result.merged, false);
    assert.equal(h.calls.filter((call) => call.url.endsWith(":commit"))[1].body.writes.length, 1);
  }
});

test("An edit from another device is retained when retrying a merge.", async () => {
  let reads = 0;
  let commits = 0;
  const changed = { ...first, note: "The other device added this note." };
  const h = harness((url) => {
    if (url.endsWith(":runQuery"))
      return [
        {
          document: ++reads === 1 ? doc() : { ...doc(changed), updateTime: "2026-11-14T00:01:00.654321Z" },
        },
      ];
    if (url.endsWith(":commit") && ++commits === 1) throw new ServiceError("FAILED_PRECONDITION");
    return {};
  });
  const result = await h.client.record(incoming);
  assert.equal(result.entry.note, changed.note);
  const commit = h.calls.filter((call) => call.url.endsWith(":commit"))[1].body;
  assert.equal(commit.writes[1].currentDocument.updateTime, "2026-11-14T00:01:00.654321Z");
});

test("An ambiguous commit failure is not automatically retried, and a later retry keeps the same record.", async () => {
  let committed = false;
  const h = harness((url) => {
    if (url.endsWith(":runQuery")) return committed ? [{ document: doc(incoming) }] : [];
    if (url.endsWith(":commit")) {
      committed = true;
      throw new Error("The response was lost.");
    }
    return {};
  });
  await assert.rejects(h.client.record(incoming), /response was lost/);
  assert.equal(h.calls.filter((call) => call.url.endsWith(":commit")).length, 1);
  assert.deepEqual((await h.client.record(incoming)).entry, incoming);
  assert.equal(h.calls.filter((call) => call.url.endsWith(":commit")).length, 1);
});

test("A racing create is read back instead of creating a second activity.", async () => {
  let reads = 0;
  const h = harness((url) => {
    if (url.endsWith(":runQuery")) return ++reads === 1 ? [] : [{ document: doc(incoming) }];
    throw new ServiceError("ALREADY_EXISTS");
  });
  assert.deepEqual((await h.client.record(incoming)).entry, incoming);
  assert.equal(h.calls.filter((call) => call.url.endsWith(":commit")).length, 1);
});

test("Missing version metadata and malformed activities cannot produce an unsafe commit.", async () => {
  const h = harness(() => [{ document: { ...doc(), updateTime: undefined } }]);
  await assert.rejects(h.client.record(incoming), /missing its version/);
  await assert.rejects(h.client.record({ ...incoming, duration: 0 }), /invalid/);
  assert.ok(!h.calls.some((call) => call.url.endsWith(":commit")));
  const malformed = harness(() => [{ document: { ...doc(), fields: {} } }]);
  await assert.rejects(malformed.client.record(incoming), /validation/);
});

test("Persistent conflicts stop after three attempts and permission errors are not retried.", async () => {
  for (const code of ["FAILED_PRECONDITION", "PERMISSION_DENIED"]) {
    let commits = 0;
    const h = harness((url) => {
      if (url.endsWith(":runQuery")) return [];
      commits++;
      throw new ServiceError(code);
    });
    await assert.rejects(h.client.record(incoming), (error) => error instanceof ServiceError && error.code === code);
    assert.equal(commits, code === "PERMISSION_DENIED" ? 1 : 3);
  }
});

test("HTTP responses preserve the conflict statuses needed for safe retries.", async () => {
  const previous = globalThis.fetch;
  try {
    for (const code of ["FAILED_PRECONDITION", "ALREADY_EXISTS"]) {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { status: code } }), {
          status: 409,
        });
      await assert.rejects(
        requestJSON("https://example.invalid"),
        (error) => error instanceof ServiceError && error.code === code,
      );
    }
  } finally {
    globalThis.fetch = previous;
  }
});

test("A daily query uses local midnight boundaries across daylight-saving changes.", async () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Berlin";
  try {
    const h = harness(() => []);
    await h.client.day("2026-03-29");
    const filters = h.calls[0].body.structuredQuery.where.compositeFilter.filters;
    assert.equal(
      Number(filters[1].fieldFilter.value.integerValue) - Number(filters[0].fieldFilter.value.integerValue),
      23 * 3600000,
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

const cardDoc = (value = card) => ({
  name: `${prefix}/cards/${value.id}`,
  fields: encodeFields(value),
  updateTime: doc().updateTime,
});

test("Card creation and editing write only a card with the appropriate version condition.", async () => {
  const h = harness(() => ({}));
  const changed = { ...card, name: "Evening Reading", duration: null };
  await h.client.saveCard(card);
  await h.client.saveCard(changed, {
    record: card,
    updateTime: cardDoc().updateTime,
  });
  assert.equal(h.calls.length, 2);
  for (const call of h.calls) {
    assert.ok(call.url.endsWith(":commit"));
    assert.equal(call.body.writes.length, 1);
    assert.equal(call.body.writes[0].update.name, cardDoc().name);
  }
  assert.deepEqual(h.calls[0].body.writes[0].currentDocument, {
    exists: false,
  });
  assert.deepEqual(h.calls[1].body.writes[0].currentDocument, {
    updateTime: cardDoc().updateTime,
  });
  assert.deepEqual(decodeDocument(h.calls[1].body.writes[0].update, prefix, "cards"), changed);
});

test("A stale card editor refuses to overwrite another client's changes.", async () => {
  const h = harness((url) => {
    if (url.endsWith(":batchGet")) return [{ found: cardDoc({ ...card, name: "Changed Elsewhere" }) }];
    throw new ServiceError("FAILED_PRECONDITION");
  });
  await assert.rejects(
    h.client.saveCard(
      { ...card, name: "My Edit" },
      {
        record: card,
        updateTime: cardDoc().updateTime,
      },
    ),
    /changed on another device/,
  );
  assert.equal(h.calls.filter((call) => call.url.endsWith(":commit")).length, 1);
});

test("An unchanged card retry confirms a previous save whose response was lost.", async () => {
  let committed = false;
  const h = harness((url) => {
    if (url.endsWith(":batchGet")) return [{ found: cardDoc() }];
    if (committed) throw new ServiceError("ALREADY_EXISTS");
    committed = true;
    throw new Error("The response was lost.");
  });
  await assert.rejects(h.client.saveCard(card), /response was lost/);
  await h.client.saveCard(card);
  assert.equal(h.calls.length, 3);
});

test("Editors read a versioned record in the current account and reject unsafe or missing records.", async () => {
  const h = harness(() => [{ found: cardDoc() }]);
  assert.deepEqual(await h.client.cardSnapshot(card.id), {
    record: card,
    updateTime: cardDoc().updateTime,
  });
  assert.deepEqual(h.calls[0].body.documents, [cardDoc().name]);
  await assert.rejects(h.client.cardSnapshot("../other-account"), /invalid/);
  assert.equal(h.calls.length, 1);
  const missing = harness(() => [{ missing: cardDoc().name }]);
  await assert.rejects(missing.client.cardSnapshot(card.id), /removed/);
  const unversioned = harness(() => [{ found: { ...doc(), updateTime: undefined } }]);
  await assert.rejects(unversioned.client.entrySnapshot(first.id), /missing its version/);
  const malformed = harness(() => ({}));
  await assert.rejects(malformed.client.cardSnapshot(card.id), /invalid record response/);
});

test("Editing a record updates its existing identity without deleting itself.", async () => {
  const changed = { ...first, note: "My updated note." };
  const h = harness((url) => (url.endsWith(":runQuery") ? [{ document: doc() }] : {}));
  const result = await h.client.record(changed, {
    record: first,
    updateTime: doc().updateTime,
  });
  assert.deepEqual(result.entry, changed);
  assert.equal(result.merged, false);
  const writes = h.calls[1].body.writes;
  assert.equal(writes.length, 1);
  assert.equal(writes[0].update.name, doc().name);
  assert.deepEqual(writes[0].currentDocument, { updateTime: doc().updateTime });
  assert.deepEqual(decodeDocument(writes[0].update, prefix, "entries"), changed);
});

test("Moving a record to another date merges target-day neighbors while preserving its identity and history.", async () => {
  const end = new Date(2026, 10, 14, 10).getTime();
  const moved = { ...first, end, start: end - 30 * 60000 };
  const neighbor = createEntry(card, { end: end + 30 * 60000, duration: 30 });
  const h = harness((url) => (url.endsWith(":runQuery") ? [{ document: doc(neighbor) }] : {}));
  const result = await h.client.record(moved, {
    record: first,
    updateTime: doc().updateTime,
  });
  assert.equal(result.merged, true);
  assert.equal(result.entry.id, first.id);
  assert.equal(result.entry.createdAt, first.createdAt);
  assert.equal(result.entry.name, first.name);
  assert.equal(result.entry.duration, 60);
  const writes = h.calls[1].body.writes;
  assert.equal(writes.length, 2);
  assert.equal(writes[0].update.name, doc().name);
  assert.equal(writes[1].delete, doc(neighbor).name);
  assert.ok(!writes.some((write) => write.delete === doc().name));
});

test("A stale record editor stops after one rejected commit instead of overwriting a newer record.", async () => {
  const h = harness((url) => {
    if (url.endsWith(":runQuery")) return [{ document: doc() }];
    if (url.endsWith(":batchGet"))
      return [
        {
          found: {
            ...doc({ ...first, note: "Changed elsewhere." }),
            updateTime: "2026-11-14T00:02:00.000001Z",
          },
        },
      ];
    throw new ServiceError("FAILED_PRECONDITION");
  });
  await assert.rejects(
    h.client.record(
      { ...first, note: "My edit." },
      {
        record: first,
        updateTime: doc().updateTime,
      },
    ),
    /changed on another device/,
  );
  assert.equal(h.calls.filter((call) => call.url.endsWith(":commit")).length, 1);
});

test("A neighbor conflict during an edit re-reads and retains the neighbor's new note.", async () => {
  let reads = 0;
  let commits = 0;
  const h = harness((url) => {
    if (url.endsWith(":runQuery")) {
      reads++;
      return [first, { ...incoming, note: reads > 1 ? "Changed neighbor." : "" }].map((entry) => ({
        document: doc(entry),
      }));
    }
    if (url.endsWith(":batchGet")) return [{ found: doc() }];
    if (++commits === 1) throw new ServiceError("FAILED_PRECONDITION");
    return {};
  });
  const result = await h.client.record(
    { ...first, note: "My edit." },
    {
      record: first,
      updateTime: doc().updateTime,
    },
  );
  assert.equal(reads, 2);
  assert.equal(commits, 2);
  assert.equal(result.entry.note, "My edit.\nChanged neighbor.");
});

test("A successful edit with a lost response can be confirmed without another overwrite.", async () => {
  const changed = { ...first, note: "My edit." };
  const h = harness((url) => {
    if (url.endsWith(":runQuery")) return [{ document: doc(changed) }];
    if (url.endsWith(":batchGet"))
      return [
        {
          found: {
            ...doc(changed),
            updateTime: "2026-11-14T00:02:00.000001Z",
          },
        },
      ];
    throw new ServiceError("FAILED_PRECONDITION");
  });
  assert.deepEqual(
    await h.client.record(changed, {
      record: first,
      updateTime: doc().updateTime,
    }),
    { entry: changed, merged: false },
  );
  assert.equal(h.calls.filter((call) => call.url.endsWith(":commit")).length, 1);
});

test("A weekly query includes cross-boundary records and uses a local Monday through Sunday range.", async () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Berlin";
  try {
    const boundary = new Date(2026, 2, 30).getTime();
    const crossing = createEntry(card, {
      end: boundary + 30 * 60000,
      duration: 60,
    });
    const h = harness(() => [{ document: doc(crossing) }]);
    const records = await h.client.week("2026-03-29");
    const filters = h.calls[0].body.structuredQuery.where.compositeFilter.filters;
    assert.equal(Number(filters[0].fieldFilter.value.integerValue), new Date(2026, 2, 23).getTime());
    assert.equal(Number(filters[1].fieldFilter.value.integerValue), boundary + 24 * 3600000);
    const week = summarizeWeek(records, "2026-03-29");
    assert.equal(week.count, 0);
    assert.ok(week.blocks[6].slots[47].activity);
    assert.equal(h.calls.length, 1);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
