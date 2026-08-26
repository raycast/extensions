import { List, Action, ActionPanel, open, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDecks } from "../hooks/useDecks";
import { useDictionarySearch } from "../hooks/useDictionarySearch";
import { useUserCardIds } from "../hooks/useUserCardIds";
import { useSubscriptionState } from "../hooks/useSubscriptionState";
import { describePlanBadge } from "../lib/subscription";
import type { SubscriptionState } from "../lib/subscription";
import { PLANS_URL } from "../constants";
import { addCardToDeck, removeCardFromDeck } from "../lib/card";
import { pronounceWord } from "../lib/audio";
import { AccountActionSection } from "./AccountActionSection";
import { AppsActionSection } from "./AppsActionSection";
import { EntryDetail } from "./EntryDetail";
import { RequestCardForm } from "./RequestCardForm";
import { SignInView } from "./SignInView";
import type { DictionaryEntry } from "../types";

/**
 * Header text: the account, plus a plan badge once the plan has been read
 * (e.g. "Inoh · me@example.com · Plus", or "… · Plus · ends 1 Sep" when a
 * change is pending). The header is the one place a List shows something at
 * all times without spending a row, so it carries the badge; the matching
 * plan action lives in the Account section.
 */
function _buildNavigationTitle(
  email: string | undefined,
  subscriptionState: SubscriptionState | undefined,
): string | undefined {
  if (!email) return undefined;
  const parts = ["Inoh", email];
  if (subscriptionState) parts.push(describePlanBadge(subscriptionState));
  return parts.join(" · ");
}

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

  // Logged-out users can search freely; adding a card needs an account.
  function promptSignIn() {
    push(<SignInView onAuthenticated={handleAuthenticated} />);
  }

  // Reason: keyed off `user` (not `isSignedIn`) so TypeScript narrows away null.
  const accountActions = user ? (
    <AccountActionSection user={user} subscriptionState={subscriptionState} onSignOut={signOut} />
  ) : null;

  const appsActions = <AppsActionSection />;

  // Reason: `refreshAuth` loads the session before popping the sign-in view,
  // so the search list renders signed-in state immediately.
  async function handleAuthenticated() {
    await refreshAuth();
    pop();
  }

  async function handleAddCard(entry: DictionaryEntry) {
    if (!isSignedIn) {
      promptSignIn();
      return;
    }

    if (!selectedDeckId) {
      await showToast({ style: Toast.Style.Failure, title: "No deck selected" });
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

    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding card..." });

    const result = await addCardToDeck(user.id, entry, selectedDeckId);

    if (result.success) {
      const addedCardId = result.cardId;
      toast.style = Toast.Style.Success;
      toast.title = "Card added";
      toast.message = `${entry.word} · press ⌘Z to undo`;
      toast.primaryAction = {
        title: "Undo",
        shortcut: { modifiers: ["cmd"], key: "z" },
        onAction: async (addedToast) => {
          addedToast.style = Toast.Style.Animated;
          addedToast.title = "Undoing...";
          const undo = await removeCardFromDeck(addedCardId);
          if (undo.success) {
            addedToast.style = Toast.Style.Success;
            addedToast.title = "Card removed";
            addedToast.message = entry.word;
            addedToast.primaryAction = undefined;
            revalidateUserCards();
          } else {
            addedToast.style = Toast.Style.Failure;
            addedToast.title = "Couldn't undo";
            addedToast.message = undo.error;
          }
        },
      };
      revalidateUserCards();
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = "Failed to add card";
    toast.message = result.error;

    if (result.isPlanLimit) {
      toast.primaryAction = {
        title: "Upgrade Plan",
        onAction: async (limitToast) => {
          await open(PLANS_URL);
          await limitToast.hide();
        },
      };
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasResults}
      navigationTitle={_buildNavigationTitle(user?.email, subscriptionState)}
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
        <List.EmptyView title="Type a word to search" icon={Icon.MagnifyingGlass} />
      ) : isSearching && !results ? (
        <List.EmptyView title="Searching..." icon={Icon.MagnifyingGlass} />
      ) : searchError ? (
        <List.EmptyView title="Search Failed" description={searchError.message} icon={Icon.ExclamationMark} />
      ) : results && results.length === 0 ? (
        <List.EmptyView
          title={`No results for "${searchText}"`}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              {isSignedIn ? (
                <Action
                  title="Request Card"
                  icon={Icon.PlusCircle}
                  onAction={() => push(<RequestCardForm userId={user.id} initialWord={searchText} />)}
                />
              ) : (
                <Action title="Sign in to Request a Card" icon={Icon.Key} onAction={promptSignIn} />
              )}
              {accountActions}
              {appsActions}
            </ActionPanel>
          }
        />
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
                    <Action title="Sign in to Add Cards" icon={Icon.Key} onAction={promptSignIn} />
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
