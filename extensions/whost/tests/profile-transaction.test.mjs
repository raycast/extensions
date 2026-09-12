import assert from "node:assert/strict";
import test from "node:test";
import {
  commitProfilesTransaction,
  ProfilesRollbackError,
} from "../src/lib/profile-transaction.ts";

test("surfaces both failures when applying and rolling back profiles fail", () => {
  const previous = ["previous"];
  const next = ["next"];
  const applyError = new Error("hosts write failed");
  const rollbackError = new Error("profile rollback failed");
  let saveCount = 0;

  const save = (profiles) => {
    saveCount += 1;
    if (saveCount === 2) {
      throw rollbackError;
    }
    assert.deepEqual(profiles, next);
  };

  assert.throws(
    () =>
      commitProfilesTransaction(previous, next, save, () => {
        throw applyError;
      }),
    (error) => {
      assert.ok(error instanceof ProfilesRollbackError);
      assert.equal(error.applyError, applyError);
      assert.equal(error.rollbackError, rollbackError);
      return true;
    },
  );
});
