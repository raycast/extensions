/**
 * What the extension can do before anyone signs in: the dictionary is public,
 * so searching works; the deck is not, so adding to it cannot.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readAccountState, resetAccount, TEST_ACCOUNT_EMAIL } from "../backend";
import type { SeededAccount } from "../backend";
import { signOutUser } from "../../src/lib/auth";
import { addCardToDeck } from "../../src/lib/card";
import { searchDictionary } from "../../src/lib/dictionary";

let account: SeededAccount;

beforeAll(async () => {
  assertLocalStackReady();
  account = resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "learner" });
  await signOutUser();
});

describe("signed out", () => {
  it("can still search the dictionary", async () => {
    const [spareWord] = account.spareWords;
    const entries = await searchDictionary(spareWord);
    expect(entries.map((entry) => entry.word)).toContain(spareWord);
  });

  it("cannot add a word to anyone's deck", async () => {
    const [spareWord] = account.spareWords;
    const [entry] = await searchDictionary(spareWord);
    // Reason: RLS refuses the insert for a caller with no session, whatever
    // user id is claimed. The module may report that as a result or throw;
    // either way the database is the assertion.
    await addCardToDeck(account.userId, entry, account.deckId).catch(() => undefined);
    expect(readAccountState(TEST_ACCOUNT_EMAIL).words).not.toContain(spareWord);
  });
});
