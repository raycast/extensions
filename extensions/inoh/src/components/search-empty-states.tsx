import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, showToast, Toast } from "@raycast/api";
import { DECK_URL, DICTIONARY_URL, GENERATE_URL } from "../constants";
import { describeUnfinishedDraft } from "../lib/drafts-copy";
import type { User } from "@supabase/supabase-js";

/**
 * What the search list shows and offers when it has no dictionary entry to act
 * on: an empty or failed search, and a word the dictionary does not have.
 *
 * These build elements rather than render as components, so the List's own
 * children are still created by the command that owns them.
 */

/** The two sections every panel here ends with, whatever the view offers first. */
type PanelSections = {
  /** The Account section, or null when nobody is signed in. */
  accountActions: ActionPanel.Children;
  /** The other Inoh apps. */
  appsActions: ActionPanel.Children;
};

/**
 * What the browse views need. `isSignedIn` decides which web app pages are
 * worth offering: a visitor can browse the dictionary, but the deck and the
 * drafts composer answer them with a "Sign in to …" screen, so offering those
 * sends them to a wall rather than to their words.
 */
type BrowseOptions = PanelSections & {
  isSignedIn: boolean;
};

type MissingWordOptions = PanelSections & {
  searchText: string;
  isSignedIn: boolean;
  /** Whether the word in the search bar is the one just written down. */
  isSavedWordOnScreen: boolean;
  /**
   * Opens sign-in, and runs the optional follow-up once the visitor is in,
   * handing it the account that signed in so it does not read a stale one.
   */
  onSignIn: (afterSignIn?: (signedInUser: User) => void) => void;
  onSaveWord: (word: string) => void;
  /** Saves the word for an account that has only just signed in. */
  onSaveWordForUser: (signedInUserId: string, word: string) => void;
};

/**
 * The ActionPanel for a view with no dictionary entry to act on: what that
 * view itself offers, then the account and the other Inoh apps. The view's own
 * actions lead, because Raycast hands ⏎ and ⌘⏎ to a panel's first two entries.
 */
function _buildPanel(viewActions: ActionPanel.Children, { accountActions, appsActions }: PanelSections) {
  return (
    <ActionPanel>
      {viewActions}
      {accountActions}
      {appsActions}
    </ActionPanel>
  );
}

const OPEN_DRAFTS_ACTION = <Action.OpenInBrowser title="Open Inoh Drafts" icon={Icon.Globe} url={GENERATE_URL} />;

/**
 * Opens the Generate command with the missed word already in it.
 *
 * Reason: the word is handed over rather than saved as a draft first. Making
 * the card needs a meaning and nothing else, so a draft in between only asks
 * the user to type the word a second time in another command.
 *
 * @param word - The word the search could not find
 */
async function _openGenerateWith(word: string) {
  try {
    await launchCommand({ name: "generate", type: LaunchType.UserInitiated, context: { word } });
  } catch {
    // Reason: a command can be turned off in Raycast's own settings, which is
    // the only way this fails and is not something the extension can fix.
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't open Generate",
      message: "Enable the Generate command in Raycast's extension settings.",
    });
  }
}

/**
 * The panel for a search with nothing to act on: nothing typed, still
 * searching, or the search failed. Browsing leads it rather than the account,
 * which has nothing to do with the search that just missed.
 *
 * @param options - The account and apps sections to end the panel with, and
 *   whether there is an account to open the deck for
 * @returns The panel to hand to those views
 */
export function buildBrowseActions({ isSignedIn, ...sections }: BrowseOptions) {
  return _buildPanel(
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open Dictionary" icon={Icon.Book} url={DICTIONARY_URL} />
      {isSignedIn ? <Action.OpenInBrowser title="Open Deck" icon={Icon.Layers} url={DECK_URL} /> : null}
    </ActionPanel.Section>,
    sections,
  );
}

/**
 * What a word the dictionary does not have offers: saving it, and once it is
 * written down, the web app link that finishes it. The link is spelled out
 * rather than left to the action alone, because the toast carrying it fades.
 *
 * Reason: the return type is inferred rather than annotated. Raycast bundles
 * its own copy of React's types, and naming `ReactElement` from the app's copy
 * makes the two disagree where the element is used.
 *
 * @returns The empty view for that word
 */
export function buildMissingWordView({
  searchText,
  isSignedIn,
  isSavedWordOnScreen,
  onSignIn,
  onSaveWord,
  onSaveWordForUser,
  ...panelSections
}: MissingWordOptions) {
  if (isSavedWordOnScreen) {
    return (
      <List.EmptyView
        title="Saved to drafts"
        description={describeUnfinishedDraft(searchText.trim())}
        icon={Icon.CheckCircle}
        actions={_buildPanel(
          <ActionPanel.Section>
            {OPEN_DRAFTS_ACTION}
            <Action.CopyToClipboard title="Copy Link" icon={Icon.Clipboard} content={GENERATE_URL} />
          </ActionPanel.Section>,
          panelSections,
        )}
      />
    );
  }

  return (
    <List.EmptyView
      title={`No results for "${searchText}"`}
      description="Not in the dictionary yet. Generate a card for it, or save it to your drafts."
      icon={Icon.XMarkCircle}
      actions={_buildPanel(
        <ActionPanel.Section>
          {/* Reason: leads the panel. Making the card is what the user came
              for; writing the word down is the thing you do when you cannot
              be bothered right now. */}
          {/* Reason: a signed-out visitor is sent to sign in rather than into
              the form, because the form cannot make the card for them. The
              word follows them through, so Generate opens on it afterwards. */}
          {isSignedIn ? (
            <Action title="Generate a Card" icon={Icon.Stars} onAction={() => _openGenerateWith(searchText.trim())} />
          ) : (
            <Action
              title="Sign in to Generate a Card"
              icon={Icon.Key}
              onAction={() => onSignIn(() => _openGenerateWith(searchText.trim()))}
            />
          )}
          {isSignedIn ? (
            <Action title="Save to Drafts" icon={Icon.PlusCircle} onAction={() => onSaveWord(searchText)} />
          ) : (
            <Action
              title="Sign in to Save a Draft"
              icon={Icon.Key}
              onAction={() => onSignIn((signedInUser) => onSaveWordForUser(signedInUser.id, searchText))}
            />
          )}
          {isSignedIn ? OPEN_DRAFTS_ACTION : null}
        </ActionPanel.Section>,
        panelSections,
      )}
    />
  );
}
