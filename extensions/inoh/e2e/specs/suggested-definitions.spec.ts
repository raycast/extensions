/**
 * The definition the Generate form writes for you (PRI-20952 follow-on).
 *
 * The field arrives filled in, because answering "which sense should this
 * card teach" from a standing start is what a search miss is least ready for.
 * Two halves are worth pinning down: that a signed-in caller really gets a
 * definition back from the deployed function, and that every way it can fail
 * leaves the user with an empty field rather than an error, since a prefill
 * is a convenience on top of a field they can always write themselves.
 *
 * The pure half of the behaviour — what the field says for itself in each
 * state — is asserted without touching the backend.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertLocalStackReady, readSignInCode, resetAccount, TEST_ACCOUNT_EMAIL } from "../backend";
import { requestEmailCode, signOutUser, verifyEmailCode } from "../../src/lib/auth";
import { suggestDefinition } from "../../src/lib/suggested-definitions";
import {
  describeSuggestionPlaceholder,
  isDefinitionStillSuggested,
  resolveMissingAnswerState,
} from "../../src/lib/definition-suggestion";

/** A real word, so the model has something to define. */
const DEFINABLE_WORD = "banyan";

/** What the field falls back to when its suggestion has nothing to add. */
const OWN_PLACEHOLDER = "Definition";

/** The dots useAnimatedEllipsis would be handing over at that moment. */
const ONE_DOT = ".";
const THREE_DOTS = "...";

describe("what the field says for itself", () => {
  it("waits out loud, so an empty field does not look broken", () => {
    expect(describeSuggestionPlaceholder("suggesting", ONE_DOT)).toBe("Suggesting a definition.");
    expect(describeSuggestionPlaceholder("suggesting", THREE_DOTS)).toBe("Suggesting a definition...");
  });

  it("tells the two failures apart, because only one is the user's to act on", () => {
    expect(resolveMissingAnswerState(true)).toBe("undefinable");
    expect(resolveMissingAnswerState(false)).toBe("unavailable");

    // A word nobody can define is usually a typo, so the spelling comes first.
    expect(describeSuggestionPlaceholder("undefinable", ONE_DOT)).toMatch(/spelling/);
    // A service that could not be reached says nothing about the word.
    expect(describeSuggestionPlaceholder("unavailable", ONE_DOT)).not.toMatch(/spelling/);
  });

  it("falls back to the field's own words when the suggestion has nothing to add", () => {
    expect(describeSuggestionPlaceholder("idle", ONE_DOT)).toBe(OWN_PLACEHOLDER);
    expect(describeSuggestionPlaceholder("suggested", ONE_DOT)).toBe(OWN_PLACEHOLDER);
  });

  it("stops calling it a suggestion the moment a character changes", () => {
    expect(isDefinitionStillSuggested("a tree", "a tree")).toBe(true);
    expect(isDefinitionStillSuggested("a tree!", "a tree")).toBe(false);
    expect(isDefinitionStillSuggested("anything", undefined)).toBe(false);
  });
});

describe("asking for a definition", () => {
  beforeAll(async () => {
    assertLocalStackReady();
    resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "empty" });

    const requestedAtMs = Date.now();
    await requestEmailCode(TEST_ACCOUNT_EMAIL);
    const signInCode = readSignInCode(TEST_ACCOUNT_EMAIL, requestedAtMs);
    await verifyEmailCode(TEST_ACCOUNT_EMAIL, signInCode);
  });

  afterAll(async () => {
    await signOutUser();
  });

  it("writes one for a real word", async () => {
    const answer = await suggestDefinition(DEFINABLE_WORD);

    expect(answer.hasServiceAnswered).toBe(true);
    expect(answer.definition?.length).toBeGreaterThan(0);
  });

  it("asks nobody when the field is empty, so an untouched form spends nothing", async () => {
    expect(await suggestDefinition("   ")).toEqual({ hasServiceAnswered: false });
  });

  it("leaves a guest with an empty field rather than an error", async () => {
    await signOutUser();

    // The function refuses callers without an account. That must cost the
    // user their prefill and nothing else, which is what an answer of "the
    // service did not answer" means to the field.
    const answer = await suggestDefinition(DEFINABLE_WORD);
    expect(answer.hasServiceAnswered).toBe(false);
    expect(answer.definition).toBeUndefined();
  });
});
