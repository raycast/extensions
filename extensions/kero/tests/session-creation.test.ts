import assert from "node:assert/strict";
import { test } from "node:test";
import { KeroError } from "../src/lib/kero";
import type { Session } from "../src/lib/model";
import { SessionInputError } from "../src/lib/new-session";
import { SessionCreationRequest } from "../src/lib/session-creation";

const session: Session = { id: "session", panes: [{ id: "pane" }] };
const callbacks = { isActive: () => true, onCreated: () => undefined };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("concurrent submissions share one creation and focus the confirmed pane only once", async () => {
  const pending = deferred<Session>();
  const request = new SessionCreationRequest();
  let creates = 0;
  let focuses = 0;
  const sequence: string[] = [];
  const client = {
    createSession: async () => {
      creates++;
      return pending.promise;
    },
    focus: async (id: string) => {
      focuses++;
      assert.equal(id, "pane");
      assert.equal(request.session, session, "Confirmed IDs must be retained before focus");
      sequence.push("focus");
    },
  };
  const first = request.run(
    client,
    { name: "first" },
    {
      ...callbacks,
      onCreated: () => {
        sequence.push("created");
      },
    },
  );
  const second = request.run(client, { name: "second" }, callbacks);
  assert.equal(first, second);
  pending.resolve(session);
  assert.deepEqual(await first, { session, opened: true });
  assert.equal(creates, 1);
  assert.equal(focuses, 1);
  assert.deepEqual(sequence, ["created", "focus"]);
});

test("focus failure retries only opening, even if the client or form input changes", async () => {
  const request = new SessionCreationRequest();
  let creates = 0;
  await assert.rejects(
    request.run(
      {
        createSession: async () => {
          creates++;
          return session;
        },
        focus: async () => {
          throw new KeroError("unreachable", "Cannot focus");
        },
      },
      { name: "original" },
      callbacks,
    ),
  );
  assert.equal(request.session, session);
  assert.equal(request.uncertain, false);
  const result = await request.run(
    {
      createSession: async () => {
        throw new Error("Must not create again");
      },
      focus: async (id: string) => {
        assert.equal(id, "pane");
      },
    },
    { name: "changed", projectId: "other" },
    callbacks,
  );
  assert.deepEqual(result, { session, opened: true });
  assert.equal(creates, 1);
});

test("submissions while focus is pending do not repeat either CLI operation", async () => {
  const request = new SessionCreationRequest();
  const pending = deferred<void>();
  let creates = 0;
  let focuses = 0;
  const client = {
    createSession: async () => {
      creates++;
      return session;
    },
    focus: async () => {
      focuses++;
      await pending.promise;
    },
  };
  const first = request.run(client, {}, callbacks);
  await Promise.resolve();
  assert.equal(focuses, 1);
  assert.equal(request.run(client, {}, callbacks), first);
  pending.resolve();
  await first;
  assert.equal(creates, 1);
  assert.equal(focuses, 1);
});

test("unconfirmed creation blocks all retries for the lifetime of the form", async () => {
  const request = new SessionCreationRequest();
  const error = new KeroError("creation-uncertain", "Check sessions first");
  let creates = 0;
  const client = {
    createSession: async () => {
      creates++;
      throw error;
    },
    focus: async () => {
      throw new Error("Must not focus");
    },
  };
  await assert.rejects(request.run(client, {}, callbacks), (reason) => reason === error);
  await assert.rejects(request.run(client, {}, callbacks), (reason) => reason === error);
  assert.equal(request.uncertain, true);
  assert.equal(request.session, undefined);
  assert.equal(creates, 1);
});

test("validation failures before mutation allow corrected input to be submitted", async () => {
  const request = new SessionCreationRequest();
  let creates = 0;
  const client = {
    createSession: async () => {
      if (++creates === 1) throw new SessionInputError("directory", "Missing folder");
      return session;
    },
    focus: async () => undefined,
  };
  await assert.rejects(request.run(client, {}, callbacks), SessionInputError);
  assert.equal(request.uncertain, false);
  assert.deepEqual(await request.run(client, { directory: "/fixed" }, callbacks), { session, opened: true });
  assert.equal(creates, 2);
});

test("unmount during creation retains the result without updating UI or initiating focus", async () => {
  const request = new SessionCreationRequest();
  const pending = deferred<Session>();
  let active = true;
  const result = request.run(
    {
      createSession: async () => pending.promise,
      focus: async () => {
        throw new Error("Must not steal focus");
      },
    },
    {},
    {
      isActive: () => active,
      onCreated: () => {
        throw new Error("Must not update unmounted UI");
      },
    },
  );
  active = false;
  pending.resolve(session);
  assert.deepEqual(await result, { session, opened: false });
  assert.equal(request.session, session);
});

test("leaving the view from the created callback also prevents focus", async () => {
  const request = new SessionCreationRequest();
  let active = true;
  const result = await request.run(
    {
      createSession: async () => session,
      focus: async () => {
        throw new Error("Must not focus after leaving");
      },
    },
    {},
    {
      isActive: () => active,
      onCreated: () => {
        active = false;
      },
    },
  );
  assert.deepEqual(result, { session, opened: false });
});
