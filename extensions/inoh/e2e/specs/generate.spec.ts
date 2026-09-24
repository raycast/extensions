/**
 * The Generate command, end to end against the local Supabase stack: a word,
 * the meaning its card should teach, and the dictionary it is headed for.
 *
 * Raycast is closed-source with no way to drive an extension's UI from a test,
 * so this exercises the extension's own request module against the real
 * database. That is where the interesting answers come from: the two writes a
 * request takes, the unique index on work already in flight, the monthly
 * allowance a request spends, and what is left behind when one is refused.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readAccountState, readSignInCode, resetAccount, TEST_ACCOUNT_EMAIL } from "../backend";
import { requestEmailCode, signOutUser, verifyEmailCode } from "../../src/lib/auth";
import { requestCard } from "../../src/lib/card-request-generate";
import { saveWordToDrafts } from "../../src/lib/card-request-drafts";
import { supabase } from "../../src/lib/supabase";

/** Words the seeded dictionary cannot contain, which is why a card is asked for. */
const TYPED_WORD = "zzzzgeneratedword";
const SAVED_WORD = "zzzzsavedword";

const MEANING = "A word invented for a test, which is the sense its card should teach.";

/**
 * A word the seeded dictionary does carry, and the sense it carries it in.
 *
 * The two meanings of "battery" are nothing like each other, so one word
 * exercises the check in both directions: the same sense has to be held, and
 * the other sense has to go straight through.
 */
const HELD_WORD = "battery";
const HELD_WORD_SAME_SENSE = "Device that stores and provides electrical energy";
const HELD_WORD_OTHER_SENSE = "the crime of unlawfully hitting another person";

let signedInUserId: string;

/** The rows this account holds for a word, whatever state they have reached. */
async function _readRequestsForWord(word: string) {
  const { data: requests } = await supabase
    .from("card_requests")
    .select("id, word, context, status, destination, source")
    .eq("user_id", signedInUserId)
    .eq("word", word)
    .order("created_at", { ascending: true });
  return requests ?? [];
}

/** How much of the month's private card allowance has been spent. */
async function _readAllowanceUsed(): Promise<number | undefined> {
  const { data: quota } = await supabase.rpc("private_card_quota").single<{ used: number }>();
  return quota?.used;
}

beforeAll(async () => {
  assertLocalStackReady();
  resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "learner" });

  const requestedAtMs = Date.now();
  await requestEmailCode(TEST_ACCOUNT_EMAIL);
  const signInCode = readSignInCode(TEST_ACCOUNT_EMAIL, requestedAtMs);
  const signedInUser = await verifyEmailCode(TEST_ACCOUNT_EMAIL, signInCode);
  signedInUserId = signedInUser.id;
});

afterAll(async () => {
  await signOutUser();

  // Reason: the cases above leave rows at `pending`, which is the generator's
  // inbox — a poller or a manual `process-requests` run would claim them and
  // spend real generation money on a synthetic word. Deleting the account
  // takes them with it (`card_requests.user_id` is ON DELETE CASCADE). A full
  // `pnpm e2e:all` ends with its own cleanup; running this suite on its own,
  // which is what development looks like, does not.
  resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "empty" });
});

describe("asking for a private card", () => {
  it("makes the card for a word that was never written down", async () => {
    expect(await requestCard(signedInUserId, `  ${TYPED_WORD}  `, `  ${MEANING}  `, "private")).toEqual({
      status: "queued",
      word: TYPED_WORD,
    });

    expect(await _readRequestsForWord(TYPED_WORD)).toEqual([
      expect.objectContaining({
        word: TYPED_WORD,
        context: MEANING,
        status: "pending",
        destination: "private",
        source: "raycast",
      }),
    ]);

    // Asking is what costs something; a draft never does.
    expect(await _readAllowanceUsed()).toBe(1);
  });

  it("refuses a word it is already making a card for, and keeps it as a draft", async () => {
    expect(await requestCard(signedInUserId, TYPED_WORD, MEANING, "private")).toEqual({
      status: "refused",
      word: TYPED_WORD,
      reason: "You already have an active request for this word.",
      isPlanLimit: false,
    });

    // The word is not lost with the refusal: it is written down, waiting in
    // both composers beside the one already being made.
    const requests = await _readRequestsForWord(TYPED_WORD);
    expect(requests.map((request) => request.status).sort()).toEqual(["draft", "pending"]);
    expect(requests.find((request) => request.status === "draft")).toMatchObject({ context: MEANING });
  });
});

describe("asking for a card for a word saved from a search miss", () => {
  it("fills in the draft that is already there instead of writing a second one", async () => {
    expect(await saveWordToDrafts(signedInUserId, SAVED_WORD)).toEqual({ status: "saved", word: SAVED_WORD });

    expect(await requestCard(signedInUserId, SAVED_WORD.toUpperCase(), MEANING, "public")).toEqual({
      status: "queued",
      word: SAVED_WORD.toUpperCase(),
    });

    const requests = await _readRequestsForWord(SAVED_WORD);
    expect(requests).toEqual([
      expect.objectContaining({ word: SAVED_WORD, context: MEANING, status: "pending", destination: "public" }),
    ]);
  });

  it("shows up among the account's requests, no longer a draft", async () => {
    expect(readAccountState(TEST_ACCOUNT_EMAIL).cardRequests).toContainEqual({
      word: SAVED_WORD,
      status: "pending",
    });
  });

  it("does not spend a private card on a public request", async () => {
    expect(await _readAllowanceUsed()).toBe(1);
  });
});

describe("asking for a card Inoh looks to have already", () => {
  it("holds the word and names the card it looks to be", async () => {
    expect(await requestCard(signedInUserId, HELD_WORD, HELD_WORD_SAME_SENSE, "public")).toEqual({
      status: "held",
      word: HELD_WORD,
      likelyExisting: expect.objectContaining({ word: HELD_WORD, foundIn: "publicDictionary" }),
    });
  });

  it("leaves the held word written down as a draft, so nothing typed is lost", async () => {
    const requests = await _readRequestsForWord(HELD_WORD);
    expect(requests).toEqual([
      expect.objectContaining({ word: HELD_WORD, context: HELD_WORD_SAME_SENSE, status: "draft" }),
    ]);
  });

  it("asks for it anyway once the user has said to", async () => {
    expect(await requestCard(signedInUserId, HELD_WORD, HELD_WORD_SAME_SENSE, "public", true)).toEqual({
      status: "queued",
      word: HELD_WORD,
    });

    const requests = await _readRequestsForWord(HELD_WORD);
    expect(requests).toEqual([expect.objectContaining({ word: HELD_WORD, status: "pending" })]);
  });

  it("never interrupts a genuinely different sense of the same word", async () => {
    // The draft above has been asked for, so this writes a fresh one. A check
    // matching on the word alone would have stopped this; matching on the
    // meaning is what lets a real second sense through.
    expect(await requestCard(signedInUserId, HELD_WORD, HELD_WORD_OTHER_SENSE, "public")).toEqual({
      status: "queued",
      word: HELD_WORD,
    });
  });
});
