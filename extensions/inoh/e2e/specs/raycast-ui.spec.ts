/**
 * Driving the real Raycast UI: open the Search Word command, type a word, and
 * press Return to add it.
 *
 * Off by default. Raycast's UI can be typed into but not read (see
 * `../raycast-ui.ts`), so this is the one suite that drives blind — it needs a
 * `ray develop` session in the foreground and your machine to itself for a few
 * seconds. Turn it on deliberately:
 *
 *   INOH_RAYCAST_UI=1 npm run e2e:test
 *
 * Prerequisites it checks for you: `assets/local-config.json` pointing at the
 * local stack, and a running `ray develop`. One it cannot check — the dev
 * extension must already be signed in as the account below, which a human does
 * once. If it is signed in as someone else the final assertion fails and says
 * so, and because the probe word exists only locally, nothing can reach a live
 * account either way.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertLocalStackReady,
  ensureSyntheticWord,
  readAccountState,
  resetAccount,
  TEST_ACCOUNT_EMAIL,
} from "../backend";
import {
  assertLocalDevExtension,
  dismissRaycast,
  isRaycastUiEnabled,
  openExtensionCommand,
  pressReturnAndAwaitDeckUpdate,
  typeAndAwaitSearchResults,
} from "../raycast-ui";

describe.skipIf(!isRaycastUiEnabled())("the Search Word command", () => {
  let probeWord: string;

  beforeAll(() => {
    assertLocalStackReady();
    assertLocalDevExtension();
    resetAccount({ email: TEST_ACCOUNT_EMAIL, profile: "empty" });
    // A word that exists only in the local dictionary — the interlock that
    // makes blind driving safe.
    probeWord = ensureSyntheticWord();
  });

  afterAll(() => {
    dismissRaycast();
  });

  it("adds a searched word to the deck", async () => {
    expect(readAccountState(TEST_ACCOUNT_EMAIL).words).not.toContain(probeWord);

    await openExtensionCommand("add-card");
    await typeAndAwaitSearchResults(probeWord);
    // The first action on a result row is "Add to Deck" (CommandRoot.tsx).
    await pressReturnAndAwaitDeckUpdate();

    // The database is the assertion: Raycast's own UI cannot be read.
    expect(readAccountState(TEST_ACCOUNT_EMAIL).words).toContain(probeWord);
  });
});
