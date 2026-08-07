import { List, Action, ActionPanel, Color, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDecks } from "../hooks/useDecks";
import { useDictionarySearch } from "../hooks/useDictionarySearch";
import { useUserCardIds } from "../hooks/useUserCardIds";
import { isProUser } from "../lib/pro-gate";
import { addCardToDeck, removeCardFromDeck, PLAN_LIMIT_ERROR } from "../lib/card";
import { pronounceWord } from "../lib/audio";
import { CHROME_EXTENSION_URL, FREE_CARD_LIMIT, OBSIDIAN_PLUGIN_URL, WEBSITE_URL } from "../constants";
import { EntryDetail } from "./EntryDetail";
import { RequestCardForm } from "./RequestCardForm";
import { UpgradeToPro } from "./UpgradeToPro";
import { SignInView } from "./SignInView";
import type { DictionaryEntry } from "../types";

/**
 * Shared root component for all commands.
 * Uses a single persistent List to prevent Raycast from resetting the search bar.
 *
 * Search is free for everyone — no account required. Authentication and the
 * Pro/free card limit only come into play when adding a card to a deck.
 */
function showComingSoonToast(appName: string) {
  void showToast({ title: "Coming soon", message: `${appName} isn't available yet — stay tuned!` });
}

export function CommandRoot({ initialSearchText }: { initialSearchText?: string }) {
  const [searchText, setSearchText] = useState(initialSearchText ?? "");
  const { push, pop } = useNavigation();
  const { user, isLoading: isAuthLoading, error: authError, refresh: refreshAuth, signOut } = useAuth();

  const { data: hasPro } = useCachedPromise((id: string) => isProUser(id), [user?.id ?? ""], {
    execute: !!user,
  });

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

  async function handleSignOut() {
    try {
      await signOut();
      await showToast({ style: Toast.Style.Success, title: "Signed out" });
    } catch (signOutError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't sign out",
        message: (signOutError as Error).message,
      });
    }
  }

  // Account email + sign-out, shown in the ActionPanel only when signed in.
  // Reason: keyed off `user` (not `isSignedIn`) so TypeScript narrows away null.
  const accountActions = user ? (
    <ActionPanel.Section title="Account">
      <Action.CopyToClipboard title={user.email ?? "Account"} content={user.email ?? ""} icon={Icon.Person} />
      <Action title="Sign Out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={handleSignOut} />
    </ActionPanel.Section>
  ) : null;

  // Cross-promotion links to the other Inoh apps, shown in every ActionPanel.
  // iOS (App Store listing mid-rebrand) has no public page, so it toasts
  // instead of linking. Brand marks are Simple Icons SVGs in assets/, tinted
  // to match the theme.
  const appsActions = (
    <ActionPanel.Section title="Apps">
      {/* eslint-disable @raycast/prefer-title-case -- "iOS" is Apple's casing; the rule also mangles "(Coming Soon)" */}
      <Action
        title="iOS App (Coming Soon)"
        icon={{ source: "apple.svg", tintColor: Color.PrimaryText }}
        onAction={() => showComingSoonToast("The iOS app")}
      />
      {/* eslint-enable @raycast/prefer-title-case */}
      <Action.OpenInBrowser title="Web App" icon={Icon.Globe} url={WEBSITE_URL} />
      <Action.OpenInBrowser
        title="Chrome Extension"
        icon={{ source: "googlechrome.svg", tintColor: Color.PrimaryText }}
        url={CHROME_EXTENSION_URL}
      />
      <Action.OpenInBrowser
        title="Obsidian Plugin"
        icon={{ source: "obsidian.svg", tintColor: Color.PrimaryText }}
        url={OBSIDIAN_PLUGIN_URL}
      />
    </ActionPanel.Section>
  );

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

    // Free-plan card limit. The server-side trigger is the source of truth; this
    // client check just avoids a doomed insert and shows the upsell immediately.
    if (hasPro === false && userCardIds.size >= FREE_CARD_LIMIT) {
      push(<UpgradeToPro />);
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

    if (result.error === PLAN_LIMIT_ERROR) {
      await toast.hide();
      push(<UpgradeToPro />);
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = "Failed to add card";
    toast.message = result.error;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasResults}
      navigationTitle={user?.email ? `Inoh · ${user.email}` : undefined}
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
