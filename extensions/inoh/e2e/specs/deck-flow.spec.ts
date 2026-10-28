/**
 * The Raycast extension's whole job, end to end against the local Supabase
 * stack: sign in with an emailed code, search the dictionary, add a word to
 * the deck, and take it back out.
 *
 * Raycast is closed-source with no way to drive an extension's UI from a test,
 * so these specs exercise the extension's real modules — its Supabase client,
 * its auth, its FSRS card seeding — rather than its rendering. What the
 * rendering does with the results is the manual checklist's job.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readAccountState, readSignInCode, resetAccount, TEST_ACCOUNT_EMAIL } from "../backend";
import type { SeededAccount } from "../backend";
import { requestEmailCode, signOutUser, verifyEmailCode } from "../../src/lib/auth";
import { addCardToDeck, removeCardFromDeck } from "../../src/lib/card";
import { searchDictionary } from "../../src/lib/dictionary";
import { fetchSubscriptionState } from "../../src/lib/subscription";
import { supabase } from "../../src/lib/supabase";

/**
 * Looks a word up in the dictionary, failing the test when it is not there.
 *
 * Takes the word rather than the account so a test that re-seeds cannot
 * silently change which word is under test.
 *
 * @param word - The word to look up
 * @returns Its dictionary entry
 */
async function findEntryOrFail(word: string) {
  const [entry] = await searchDictionary(word);
  expect(entry).toBeDefined();
  return entry;
}

/**
 * The `user_cards` rows an account holds for one dictionary entry.
 *
 * @param signedInUserId - Whose cards to read
 * @param dictionaryId - The dictionary entry to look for
 * @returns The matching rows, empty when the account does not have the card
 */
async function readUserCardsForEntry(signedInUserId: string, dictionaryId: string) {
  const { data: cards } = await supabase
    .from("user_cards")
    .select("id, card_state, review_count")
    .eq("user_id", signedInUserId)
    .eq("dictionary_id", dictionaryId);
  return cards ?? [];
}

/**
 * Signs in through the extension's own auth module with a real emailed code.
 *
 * @param email - The seeded test account's address
 * @returns The signed-in user
 */
async function signInAs(email: string) {
  const requestedAtMs = Date.now();
  await requestEmailCode(email);
  return verifyEmailCode(email, readSignInCode(email, requestedAtMs));
}

let seededAccount: SeededAccount;
/** The word the add/remove tests operate on: the first one left off the deck. */
let probeWord: string;
let signedInUserId: string;

beforeAll(async () => {
  assertLocalStackReady();
  seededAccount = resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "learner" });
  probeWord = seededAccount.spareWords[0];

  signedInUserId = (await signInAs(TEST_ACCOUNT_EMAIL)).id;
});

afterAll(async () => {
  await signOutUser();
});

describe("signing in", () => {
  it("signs in as the seeded account and keeps the session", async () => {
    expect(signedInUserId).toBe(seededAccount.userId);
    const { data: sessionData } = await supabase.auth.getSession();
    expect(sessionData.session?.user.email).toBe(TEST_ACCOUNT_EMAIL);
  });

  it("reports the account on the free plan", async () => {
    const subscriptionState = await fetchSubscriptionState(signedInUserId);
    expect(subscriptionState.tier).toBe("free");
  });
});

describe("searching the dictionary", () => {
  it("finds a word that exists", async () => {
    const entries = await searchDictionary(probeWord);
    expect(entries.map((entry) => entry.word)).toContain(probeWord);
  });

  it("returns nothing for a word that does not exist", async () => {
    expect(await searchDictionary("zzzznotaword")).toEqual([]);
  });
});

describe("adding and removing a card", () => {
  it("adds a searched word to the deck", async () => {
    const entry = await findEntryOrFail(probeWord);

    const addResult = await addCardToDeck(signedInUserId, entry, seededAccount.deckId);
    expect(addResult).toEqual({ success: true, cardId: expect.any(String) });
    expect(readAccountState(TEST_ACCOUNT_EMAIL).words).toContain(entry.word);
  });

  it("seeds the new card as unreviewed, so it comes up for review", async () => {
    const entry = await findEntryOrFail(probeWord);
    const cards = await readUserCardsForEntry(signedInUserId, entry.id);

    expect(cards).toHaveLength(1);
    expect(cards[0].card_state).toBe("new");
    expect(cards[0].review_count).toBe(0);
  });

  it("removes a card from the deck", async () => {
    const entry = await findEntryOrFail(probeWord);
    const [card] = await readUserCardsForEntry(signedInUserId, entry.id);

    const removeResult = await removeCardFromDeck(card.id as string);
    expect(removeResult.success).toBe(true);
    expect(readAccountState(TEST_ACCOUNT_EMAIL).words).not.toContain(entry.word);
  });

  it("reports a word already in the deck rather than duplicating it", async () => {
    const entry = await findEntryOrFail(seededAccount.words[0]);

    const duplicateAdd = await addCardToDeck(signedInUserId, entry, seededAccount.deckId);
    expect(duplicateAdd).toEqual({ success: false, error: "This card is already in your deck" });
    expect(readAccountState(TEST_ACCOUNT_EMAIL).cardCount).toBe(seededAccount.cardCount);
  });
});

describe("the free card cap", () => {
  it("refuses a card once the plan is full and says why", async () => {
    const cappedAccount = resetAccount({ email: TEST_ACCOUNT_EMAIL, plan: "free", profile: "card-cap" });
    const user = await signInAs(TEST_ACCOUNT_EMAIL);

    const entry = await findEntryOrFail(cappedAccount.spareWords[0]);
    const cappedAdd = await addCardToDeck(user.id, entry, cappedAccount.deckId);

    expect(cappedAdd.success).toBe(false);
    expect(cappedAdd).toMatchObject({
      isPlanLimit: true,
      // The message the extension shows must be the plan's own wording, with
      // the `CARD_LIMIT:` marker the trigger prefixes already stripped.
      error: expect.stringContaining("Free plan holds up to 300 cards"),
    });
    expect(readAccountState(TEST_ACCOUNT_EMAIL).cardCount).toBe(cappedAccount.cardCount);
  });
});
