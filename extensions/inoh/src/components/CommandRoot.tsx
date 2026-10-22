import { List, Action, ActionPanel, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDecks } from "../hooks/useDecks";
import { useDictionarySearch } from "../hooks/useDictionarySearch";
import { useUserCardIds } from "../hooks/useUserCardIds";
import { useSubscriptionState } from "../hooks/useSubscriptionState";
import { useDraftWord } from "../hooks/useDraftWord";
import { describeAccountHeader } from "../lib/subscription";
import { addCardAfterSignIn, addCardWithFeedback } from "../lib/card-actions";
import { pronounceWord } from "../lib/audio";
import { AccountActionSection } from "./AccountActionSection";
import { AppsActionSection } from "./AppsActionSection";
import { buildBrowseActions, buildMissingWordView } from "./search-empty-states";
import { EntryDetail } from "./EntryDetail";
import { SignInView } from "./SignInView";
import type { DictionaryEntry } from "../types";
import type { User } from "@supabase/supabase-js";

/**
 * Shared root component for all commands.
 * Uses a single persistent List to prevent Raycast from resetting the search bar.
 *
 * Search is free for everyone — no account required. Authentication only comes
 * into play when adding a card to a deck, and total cards are capped per plan
 * (Free 300 / Plus 1,000 / Pro unlimited).
 */
export function CommandRoot({ initialSearchText }: { initialSearchText?: string }) {
  const [searchText, setSearchText] = useState(initialSearchText ?? "");
  const { push, pop } = useNavigation();
  const { user, isLoading: isAuthLoading, error: authError, refresh: refreshAuth, signOut } = useAuth();

  const { subscriptionState } = useSubscriptionState(user?.id ?? null);

  const { decks, isLoading: isDecksLoading } = useDecks(user?.id ?? null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id ?? "");

  const { userCardIds, revalidate: revalidateUserCards } = useUserCardIds(user?.id ?? null);

  const { results, isLoading: isSearching, error: searchError } = useDictionarySearch(searchText);

  const { savedWord, saveWord, saveWordForUser } = useDraftWord({
    user,
    onSignInRequired: promptSignIn,
  });

  useEffect(() => {
    if (initialSearchText) {
      setSearchText(initialSearchText);
    }
  }, [initialSearchText]);

  // Reason: a failed session restore shouldn't block free search — surface the
  // failure as a toast and let the user keep searching as a logged-out visitor.
  useEffect(() => {
    if (authError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't restore session",
        message: authError.message || "Sign in again to add cards.",
      });
    }
  }, [authError]);

  const isLoading = isAuthLoading || isDecksLoading || isSearching;
  const hasResults = !!results?.length;
  const isSignedIn = !!user;

  // Reason: derived, not reset in an effect — typing takes the saved view down with it.
  const isSavedWordOnScreen = savedWord !== null && savedWord === searchText.trim();

  /**
   * What a visitor was doing when the sign-in view interrupted them, resumed
   * with the account that signed in.
   *
   * Reason: the account is passed rather than read from state. This callback
   * was created in a render where there was no user, and `refreshAuth` only
   * schedules the next render, so anything the callback reads from state is
   * still the signed-out version when it runs.
   */
  const resumeAfterSignInRef = useRef<((signedInUser: User) => void) | null>(null);

  /**
   * Opens the sign-in view, and carries on with whatever the visitor was
   * trying to do once they are in.
   *
   * Reason: a signed-out action that names signing in has to go there, and
   * then finish the job. Sending someone to sign in and dropping them back
   * where they started makes them ask for the same thing twice.
   *
   * @param afterSignIn - What they were doing, run once they are signed in
   */
  function promptSignIn(afterSignIn?: (signedInUser: User) => void) {
    resumeAfterSignInRef.current = afterSignIn ?? null;
    push(<SignInView onAuthenticated={handleAuthenticated} />);
  }

  const accountActions = (
    <AccountActionSection
      user={user ?? null}
      subscriptionState={subscriptionState}
      onSignIn={promptSignIn}
      onSignOut={signOut}
    />
  );

  const appsActions = <AppsActionSection />;

  // Reason: `refreshAuth` loads the session before popping the sign-in view,
  // so the search list renders signed-in state immediately.
  async function handleAuthenticated(signedInUser: User) {
    await refreshAuth();
    pop();

    // Reason: a ref rather than state. The sign-in view closed over this
    // function when it was pushed, so anything set after that point is only
    // visible through a ref.
    const resume = resumeAfterSignInRef.current;
    resumeAfterSignInRef.current = null;
    resume?.(signedInUser);
  }

  /**
   * Adds the card, sending a signed-out visitor through sign-in first.
   *
   * Reason: both the signed-in and the signed-out row action call this, so the
   * rule for what happens after signing in lives in one place. The account
   * comes from the resume callback rather than `user`, which is still the
   * signed-out value in the closure the callback was created in.
   *
   * @param entry - The dictionary entry whose card is being added
   */
  async function handleAddCard(entry: DictionaryEntry) {
    if (!user) {
      promptSignIn((signedInUser) => addCardAfterSignIn(signedInUser.id, entry, revalidateUserCards));
      return;
    }

    if (userCardIds.has(entry.id)) {
      await showToast({
        style: Toast.Style.Success,
        title: "Already in deck",
        message: `"${entry.word}" is already in your deck`,
      });
      return;
    }

    await addCardWithFeedback(user.id, entry, selectedDeckId, revalidateUserCards);
  }

  const panelSections = { accountActions, appsActions };
  const browseActions = buildBrowseActions({ ...panelSections, isSignedIn });
  const missingWordView = buildMissingWordView({
    ...panelSections,
    searchText,
    isSignedIn,
    isSavedWordOnScreen,
    onSignIn: promptSignIn,
    onSaveWord: saveWord,
    onSaveWordForUser: saveWordForUser,
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasResults}
      navigationTitle={describeAccountHeader(user?.email, subscriptionState)}
      searchText={searchText}
      searchBarPlaceholder="Search for a word..."
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={
        isSignedIn && decks.length > 0 ? (
          <List.Dropdown tooltip="Select Deck" storeValue={true} onChange={setSelectedDeckId}>
            {decks.map((deck) => (
              <List.Dropdown.Item key={deck.id} title={deck.name} value={deck.id} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {searchText.length === 0 ? (
        <List.EmptyView title="Type a word to search" icon={Icon.MagnifyingGlass} actions={browseActions} />
      ) : isSearching && !results ? (
        <List.EmptyView title="Searching..." icon={Icon.MagnifyingGlass} actions={browseActions} />
      ) : searchError ? (
        <List.EmptyView
          title="Search Failed"
          description={searchError.message}
          icon={Icon.ExclamationMark}
          actions={browseActions}
        />
      ) : results && results.length === 0 ? (
        missingWordView
      ) : (
        (results || []).map((entry) => {
          const isAlreadyInDeck = isSignedIn && userCardIds.has(entry.id);

          return (
            <List.Item
              key={entry.id}
              title={entry.word}
              subtitle={entry.definition}
              accessories={isAlreadyInDeck ? [{ icon: Icon.CheckCircle, tooltip: "Already in deck" }] : []}
              detail={<EntryDetail entry={entry} isLoading={isSearching} />}
              actions={
                <ActionPanel>
                  {isSignedIn ? (
                    <Action title="Add to Deck" icon={Icon.Plus} onAction={() => handleAddCard(entry)} />
                  ) : (
                    <Action title="Sign in to Add Cards" icon={Icon.Key} onAction={() => handleAddCard(entry)} />
                  )}
                  <Action
                    title="Pronounce"
                    icon={Icon.SpeakerHigh}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => pronounceWord(entry.word_audio_path, entry.word)}
                  />
                  {accountActions}
                  {appsActions}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
