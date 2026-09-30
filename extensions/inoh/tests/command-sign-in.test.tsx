import "./support/act-environment";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNED_IN_USER, finishLatestSignIn } from "./support/sign-in";
import { CommandRoot } from "../src/components/CommandRoot";
import { addCardToDeck, removeCardFromDeck } from "../src/lib/card";
import { fetchDecks } from "../src/lib/decks";
import { Action, List, showToast } from "./support/raycast";
import type { Deck, DictionaryEntry } from "../src/types";

vi.mock("@raycast/api", async () => import("./support/raycast.js"));
vi.mock("../src/lib/card", () => ({ addCardToDeck: vi.fn(), removeCardFromDeck: vi.fn() }));
vi.mock("../src/lib/decks", () => ({ fetchDecks: vi.fn() }));
vi.mock("../src/lib/audio", () => ({ pronounceWord: vi.fn() }));
vi.mock("../src/lib/subscription", () => ({ describeAccountHeader: () => "Inoh" }));
vi.mock("../src/components/AccountActionSection", () => ({ AccountActionSection: () => null }));
vi.mock("../src/components/AppsActionSection", () => ({ AppsActionSection: () => null }));
vi.mock("../src/components/EntryDetail", () => ({ EntryDetail: () => null }));
vi.mock("../src/components/SignInView", () => ({ SignInView: () => null }));
vi.mock("../src/components/search-empty-states", () => ({
  buildBrowseActions: () => null,
  buildMissingWordView: () => null,
}));

const mockedHookState = vi.hoisted(() => ({
  user: null as User | null,
  decks: [] as Deck[],
  entries: [] as DictionaryEntry[],
  userCardIds: new Set<string>(),
  refresh: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockedHookState.user, refresh: mockedHookState.refresh }),
}));
vi.mock("../src/hooks/useDecks", () => ({ useDecks: () => ({ decks: mockedHookState.decks, isLoading: false }) }));
vi.mock("../src/hooks/useUserCardIds", () => ({
  useUserCardIds: () => ({ userCardIds: mockedHookState.userCardIds, revalidate: mockedHookState.revalidate }),
}));
vi.mock("../src/hooks/useDictionarySearch", () => ({
  useDictionarySearch: () => ({ results: mockedHookState.entries }),
}));
vi.mock("../src/hooks/useSubscriptionState", () => ({ useSubscriptionState: () => ({}) }));
vi.mock("../src/hooks/useDraftWord", () => ({ useDraftWord: () => ({ savedWord: null }) }));

const ENTRY: DictionaryEntry = {
  id: "apple-entry",
  word: "apple",
  definition: "a fruit",
  example_sentence: "An apple.",
  image_path: null,
  word_audio_path: null,
  definition_audio_path: null,
  sentence_audio_path: null,
  word_distractors: null,
  definition_distractors: null,
  created_at: "",
  updated_at: "",
};
const DECK: Deck = {
  id: "signed-in-deck",
  user_id: SIGNED_IN_USER.id,
  name: "My deck",
  created_at: "",
  updated_at: "",
};

function _createPendingDecks() {
  let resolveDecks!: (decks: Deck[]) => void;
  const promise = new Promise<Deck[]>((resolve) => {
    resolveDecks = resolve;
  });
  return { promise, resolveDecks };
}

describe("Add to Deck across sign-in", () => {
  let renderer: ReactTestRenderer | undefined;

  async function renderCommand() {
    await act(async () => {
      const element = createElement(CommandRoot, { initialSearchText: "apple" });
      if (renderer) renderer.update(element);
      else renderer = create(element);
    });
  }

  async function pressAdd() {
    const action = renderer!.root
      .findAllByType(Action)
      .find((element) => ["Sign in to Add Cards", "Add to Deck"].includes(element.props.title));
    await act(async () => {
      await action!.props.onAction();
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockedHookState.user = null;
    mockedHookState.decks = [];
    mockedHookState.entries = [ENTRY];
    mockedHookState.userCardIds = new Set();
    vi.mocked(fetchDecks).mockReset().mockResolvedValue([DECK]);
    vi.mocked(addCardToDeck).mockReset().mockResolvedValue({ success: true, cardId: "added-card" });
    mockedHookState.refresh.mockImplementation(async () => {
      mockedHookState.user = SIGNED_IN_USER;
    });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = undefined;
  });

  it("waits for the signed-in account's decks and adds the original entry once without a second press", async () => {
    const pendingDecks = _createPendingDecks();
    vi.mocked(fetchDecks).mockReturnValue(pendingDecks.promise);
    await renderCommand();
    await pressAdd();
    await finishLatestSignIn();
    expect(fetchDecks).toHaveBeenCalledWith(SIGNED_IN_USER.id);
    expect(addCardToDeck).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();

    mockedHookState.entries = [{ ...ENTRY, id: "banana-entry", word: "banana" }];
    mockedHookState.decks = [DECK];
    await renderCommand();
    await act(async () => {
      pendingDecks.resolveDecks([DECK]);
    });
    expect(addCardToDeck).toHaveBeenCalledExactlyOnceWith(SIGNED_IN_USER.id, ENTRY, DECK.id);
    expect(mockedHookState.revalidate).toHaveBeenCalledOnce();
    expect(showToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "No deck selected" }));
    await renderCommand();
    expect(addCardToDeck).toHaveBeenCalledOnce();
  });

  it("reports an account with no decks without inserting a card", async () => {
    vi.mocked(fetchDecks).mockResolvedValue([]);
    await renderCommand();
    await pressAdd();
    await finishLatestSignIn();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "No deck selected" }));
    expect(addCardToDeck).not.toHaveBeenCalled();
  });

  it("reports a failed deck load without inserting a card", async () => {
    vi.mocked(fetchDecks).mockRejectedValue(new Error("Deck service unavailable"));
    await renderCommand();
    await pressAdd();
    await finishLatestSignIn();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Couldn't load decks",
        message: "Deck service unavailable",
      }),
    );
    expect(addCardToDeck).not.toHaveBeenCalled();
  });

  it("keeps the selected deck and undo when already signed in", async () => {
    mockedHookState.user = SIGNED_IN_USER;
    mockedHookState.decks = [DECK, { ...DECK, id: "other-deck" }];
    vi.mocked(removeCardFromDeck).mockResolvedValue({ success: true });
    await renderCommand();
    await act(async () => {
      renderer!.root.findByType(List.Dropdown).props.onChange("other-deck");
    });
    await pressAdd();
    expect(addCardToDeck).toHaveBeenCalledExactlyOnceWith(SIGNED_IN_USER.id, ENTRY, "other-deck");
    expect(fetchDecks).not.toHaveBeenCalled();
    const toast = (await showToast.mock.results[0].value) as {
      primaryAction: { onAction: (toast: unknown) => Promise<void> };
    };
    await act(async () => {
      await toast.primaryAction.onAction(toast);
    });
    expect(removeCardFromDeck).toHaveBeenCalledExactlyOnceWith("added-card");
    expect(mockedHookState.revalidate).toHaveBeenCalledTimes(2);
  });

  it("does not insert an entry already in the signed-in account's cards", async () => {
    mockedHookState.user = SIGNED_IN_USER;
    mockedHookState.decks = [DECK];
    mockedHookState.userCardIds = new Set([ENTRY.id]);
    await renderCommand();
    await pressAdd();
    expect(addCardToDeck).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Already in deck" }));
  });
});
