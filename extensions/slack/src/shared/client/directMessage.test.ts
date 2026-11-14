import assert from "node:assert/strict";
import test from "node:test";
import { performDirectMessageAction, resolveDirectMessageId } from "./directMessage";

for (const userId of ["U12345678", "W12345678"]) {
  test(`resolves ${userId} on demand before opening or copying a link`, async () => {
    const events: string[] = [];
    await performDirectMessageAction(
      userId,
      undefined,
      async (args) => {
        assert.deepEqual(args, { users: userId });
        events.push("resolve");
        return { ok: true, channel: { id: "D12345678" } };
      },
      async (id) => {
        events.push(`link/${id}`);
      },
      async () => {
        assert.fail("Unexpected error");
      },
    );
    assert.deepEqual(events, ["resolve", "link/D12345678"]);
  });
}

test("reuses an existing valid DM without an API call", async () => {
  assert.equal(
    await resolveDirectMessageId("U12345678", "D12345678", async () => {
      assert.fail("Already resolved");
    }),
    "D12345678",
  );
});

for (const response of [
  {},
  { channel: {} },
  { channel: { id: "undefined" } },
  { channel: { id: "C12345678" } },
  { error: "missing_scope", channel: { id: "D12345678" } },
  { ok: false },
]) {
  test(`invalid Slack response cannot reach a link action: ${JSON.stringify(response)}`, async () => {
    let errors = 0;
    await performDirectMessageAction(
      "U12345678",
      undefined,
      async () => response,
      async () => {
        assert.fail("Must not open or copy an invalid link");
      },
      async () => {
        errors++;
      },
    );
    assert.equal(errors, 1);
  });
}

test("request failures are handled without invoking the link action", async () => {
  const failure = new Error("network failure");
  await performDirectMessageAction(
    "U12345678",
    undefined,
    async () => {
      throw failure;
    },
    async () => {
      assert.fail("Must not open or copy a link");
    },
    async (error) => {
      assert.equal(error, failure);
    },
  );
});
