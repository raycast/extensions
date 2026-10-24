/**
 * What the extension does with a word the dictionary does not have, end to end
 * against the local Supabase stack: write it down as a draft, and leave the
 * card itself to the web app.
 *
 * Raycast is closed-source with no way to drive an extension's UI from a test,
 * so this exercises the extension's real draft module against the real
 * database — including the check constraint that only lets `raycast` name
 * itself as a source because PRI-20854 widened it. What the rendering does
 * with the result is the manual checklist's job.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readAccountState, readSignInCode, resetAccount, TEST_ACCOUNT_EMAIL } from "../backend";
import { requestEmailCode, signOutUser, verifyEmailCode } from "../../src/lib/auth";
import { saveWordToDrafts } from "../../src/lib/card-request-drafts";
import type { SaveDraftResult } from "../../src/types";
import { searchDictionary } from "../../src/lib/dictionary";
import { supabase } from "../../src/lib/supabase";

/** A word the seeded dictionary cannot contain, which is the case under test. */
const MISSING_WORD = "zzzznotaword";

let signedInUserId: string;
/** The outcome of the one save the setup performs, which the cases below read. */
let firstSaveResult: SaveDraftResult;

/**
 * The draft rows this account holds for one word.
 *
 * Read through the extension's own client rather than the fixture, because
 * what matters here is the columns a draft carries — the fixture's snapshot
 * only reports the word and its status.
 *
 * @param word - The word to look for
 * @returns The matching rows, empty when the word was never written down
 */
async function _readDraftsForWord(word: string) {
  const { data: drafts } = await supabase
    .from("card_requests")
    .select("id, word, context, status, destination, source")
    .eq("user_id", signedInUserId)
    .eq("word", word);
  return drafts ?? [];
}

beforeAll(async () => {
  assertLocalStackReady();
  resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "learner" });

  const requestedAtMs = Date.now();
  await requestEmailCode(TEST_ACCOUNT_EMAIL);
  const signInCode = readSignInCode(TEST_ACCOUNT_EMAIL, requestedAtMs);
  const signedInUser = await verifyEmailCode(TEST_ACCOUNT_EMAIL, signInCode);
  signedInUserId = signedInUser.id;

  // Reason: saved here rather than in the first case, so the cases that
  // inspect the draft each stand on their own. The cases after them are an
  // ordered narrative on purpose — save again, then again in another case,
  // then throw it away — and read top to bottom.
  firstSaveResult = await saveWordToDrafts(signedInUserId, MISSING_WORD);
});

afterAll(async () => {
  await signOutUser();
});

describe("writing down a word the dictionary does not have", () => {
  it("has nothing to offer for the word, which is what starts the flow", async () => {
    expect(await searchDictionary(MISSING_WORD)).toEqual([]);
  });

  it("saves the word as a draft", () => {
    expect(firstSaveResult).toEqual({ status: "saved", word: MISSING_WORD });
  });

  it("records it as an unsubmitted private draft asked for from Raycast", async () => {
    const [draft] = await _readDraftsForWord(MISSING_WORD);

    expect(draft).toMatchObject({
      word: MISSING_WORD,
      status: "draft",
      destination: "private",
      source: "raycast",
      // Blank on purpose: the meaning is collected in the web app, and the
      // database only requires one once the row leaves `draft`.
      context: "",
    });
  });

  it("leaves it out of the month's private card allowance", async () => {
    const { data: quota } = await supabase.rpc("private_card_quota").single<{ used: number }>();

    expect(quota?.used).toBe(0);
  });

  it("says the word is already there rather than writing it down twice", async () => {
    expect(await saveWordToDrafts(signedInUserId, MISSING_WORD)).toEqual({
      status: "already-saved",
      word: MISSING_WORD,
    });
    expect(await _readDraftsForWord(MISSING_WORD)).toHaveLength(1);
  });

  it("ignores the case the word was searched in", async () => {
    expect(await saveWordToDrafts(signedInUserId, MISSING_WORD.toUpperCase())).toEqual({
      status: "already-saved",
      word: MISSING_WORD.toUpperCase(),
    });
    expect(await _readDraftsForWord(MISSING_WORD.toUpperCase())).toHaveLength(0);
  });

  it("shows up among the account's requests, alongside the cards it already asked for", async () => {
    expect(readAccountState(TEST_ACCOUNT_EMAIL).cardRequests).toContainEqual({
      word: MISSING_WORD,
      status: "draft",
    });
  });

  it("can be thrown away again, which is the web app's Discard", async () => {
    const [draft] = await _readDraftsForWord(MISSING_WORD);

    const { error } = await supabase.from("card_requests").delete().eq("id", draft.id);

    expect(error).toBeNull();
    expect(await _readDraftsForWord(MISSING_WORD)).toEqual([]);
  });
});
