import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePrivateCardQuota } from "../hooks/usePrivateCardQuota";
import { useSubscriptionState } from "../hooks/useSubscriptionState";
import { PLANS_URL } from "../constants";
import { requestCard } from "../lib/card-request-generate";
import { buildOpenUrlToastAction } from "../lib/toast-actions";
import { describeLowAllowance } from "../lib/private-card-quota";
import { buildMyRequestsUrl } from "../lib/web-app-urls";
import { INITIAL_DESTINATION } from "../lib/card-request-drafts";
import { DESTINATION_COPY, DICTIONARY_DESTINATIONS } from "../lib/destination-copy";
import { AccountActionSection } from "./AccountActionSection";
import { AppsActionSection } from "./AppsActionSection";
import { SignInView } from "./SignInView";
import type { CardRequestDestination, RequestCardResult } from "../types";
import type { User } from "@supabase/supabase-js";

/** The web app's composer asks for the meaning in these words; so does this. */
const MEANING_PLACEHOLDER = "Which meaning should this card teach?";

/**
 * What the form is still missing, in the words to say about it.
 *
 * Reason: the meaning is checked here rather than left to the database, which
 * refuses a request without one in words written for a constraint violation.
 *
 * @param word - The word as typed
 * @param meaning - The meaning as typed
 * @returns What to ask for, or null when the form is ready to send
 */
function _findMissingFieldTitle(word: string, meaning: string): string | null {
  if (word.trim().length === 0) return "Type the word to make a card for";
  if (meaning.trim().length === 0) return "Say which meaning the card should teach";
  return null;
}

/**
 * Reports a refused request: the database's own sentence, and the upgrade when
 * there is one to offer. The word stays written down as a draft either way,
 * which the message says out loud because the form is about to be cleared.
 *
 * @param toast - The toast raised when the request was sent
 * @param refusal - What the database would not take, and why
 * @param isUpgradeOffered - Whether the user has a plan to move up to
 */
function _reportRefusal(
  toast: Toast,
  refusal: Extract<RequestCardResult, { status: "refused" }>,
  isUpgradeOffered: boolean,
) {
  toast.style = Toast.Style.Failure;
  // Reason: a short headline over the refusal itself. The database names the
  // plan and its monthly limit in a full sentence ("your Free plan makes 50
  // private cards a month and you have used them all…"), which is too long to
  // read as a title.
  toast.title = refusal.isPlanLimit ? "Private card limit reached" : "Word not taken";
  toast.message = `${refusal.reason} "${refusal.word}" is waiting in your drafts.`;

  if (isUpgradeOffered) {
    toast.primaryAction = buildOpenUrlToastAction("Upgrade Plan", PLANS_URL);
  }
}

/**
 * Confirms the card has been asked for, and offers the list it will show up in.
 *
 * @param toast - The toast raised when the request was sent
 * @param destination - Which dictionary it went to, which is all of the copy
 */
function _reportQueued(toast: Toast, destination: CardRequestDestination) {
  const myRequestsUrl = buildMyRequestsUrl(destination);

  toast.style = Toast.Style.Success;
  toast.title = DESTINATION_COPY[destination].queuedHeadline;
  // Reason: the address is spelled out rather than left to the action alone.
  // The toast fades, and the page is where the card is watched from there on.
  toast.message = `See ${myRequestsUrl}`;
  toast.primaryAction = buildOpenUrlToastAction("My Requests", myRequestsUrl, { modifiers: ["cmd"], key: "o" });
}

/**
 * Generate — a word the dictionary does not have, the meaning its card should
 * teach, and which dictionary it is headed for.
 *
 * It exists for the same reason the web app's Generate tab does: making a card
 * used to be reachable only by searching for something and failing to find it,
 * so discovering it required failing first.
 *
 * The meaning is asked for rather than guessed. A word alone is not enough to
 * generate from — "spring" has several senses and a card teaches one — which
 * is why the database refuses a request that carries none. A search that found
 * nothing hands its word over, so only the meaning is left to type.
 */
export function GenerateCardForm({ initialWord }: { initialWord?: string }) {
  const { user, isLoading: isAuthLoading, refresh: refreshAuth, signOut } = useAuth();
  const { subscriptionState } = useSubscriptionState(user?.id ?? null);
  const { privateCardQuota, revalidatePrivateCardQuota } = usePrivateCardQuota(user !== null);
  const [destination, setDestination] = useState<CardRequestDestination>(INITIAL_DESTINATION);
  const [word, setWord] = useState(initialWord ?? "");
  const [meaning, setMeaning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Whether a submit is waiting on the sign-in view to come back. */
  const isSubmitPendingRef = useRef(false);
  const { push, pop } = useNavigation();

  async function handleAuthenticated(signedInUser: User) {
    await refreshAuth();
    pop();

    // Reason: a ref rather than state. The sign-in view closed over this
    // function when it was pushed, so a flag set after that point is only
    // visible through a ref.
    if (isSubmitPendingRef.current) {
      isSubmitPendingRef.current = false;
      await _requestCardFor(signedInUser.id);
    }
  }

  /** Nothing here reaches the database without an account, so this is the way in. */
  function promptSignIn() {
    push(<SignInView onAuthenticated={handleAuthenticated} />);
  }

  async function handleSubmit() {
    const missingFieldTitle = _findMissingFieldTitle(word, meaning);
    if (missingFieldTitle !== null) {
      await showToast({ style: Toast.Style.Failure, title: missingFieldTitle });
      return;
    }

    // Reason: the account is needed for the row, not for the form, so the
    // sign-in step comes after the user has said what they want. What they
    // typed survives the sign-in view, which is pushed over this form rather
    // than replacing it, and `_resumeAfterSignIn` finishes the submit for them.
    if (!user) {
      isSubmitPendingRef.current = true;
      promptSignIn();
      return;
    }

    await _requestCardFor(user.id);
  }

  /**
   * Asks for the card, and reports what came back.
   *
   * @param userId - Whose card it is, passed in because a submit resumed after
   *   signing in knows the new account before this component's state does
   */
  async function _requestCardFor(userId: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${DESTINATION_COPY[destination].submitTitle}...`,
    });
    setIsSubmitting(true);
    const requestResult = await requestCard(userId, word, meaning, destination);
    setIsSubmitting(false);

    if (requestResult.status === "failed") {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't ask for the card";
      toast.message = requestResult.error;
      return;
    }

    if (requestResult.status === "refused") {
      // Reason: the top plan has nothing above it, and the database's own
      // refusal says so — it tells a Pro account when the allowance resets
      // instead of naming a plan to move to. An unread plan counts as Pro
      // here: a submit resumed after signing in runs in a closure where the
      // plan has not been read yet, and offering Pro an upgrade reads worse
      // than withholding one for the moment it takes to know.
      const isTierKnownAndBelowPro = subscriptionState !== undefined && subscriptionState.tier !== "pro";
      const isUpgradeOffered = requestResult.isPlanLimit && isTierKnownAndBelowPro;
      _reportRefusal(toast, requestResult, isUpgradeOffered);
      return;
    }

    // The form empties itself so the next word can be typed straight into it.
    setWord("");
    setMeaning("");
    // Reason: only a card that was actually asked for spends the allowance.
    revalidatePrivateCardQuota();

    _reportQueued(toast, destination);
  }

  // Reason: only the private side has a monthly allowance to run out of.
  const lowAllowanceNote = destination === "private" ? describeLowAllowance(privateCardQuota?.remaining ?? null) : null;

  /**
   * Reason: the tally replaces the standing promise rather than joining it, as
   * it does in the web app. Once the allowance is nearly gone, how soon the
   * card arrives matters less than whether there is one left to make.
   */
  /**
   * Reason: a visitor is told about the account before typing a meaning, not
   * after pressing Generate. Signing in from here keeps what they typed and
   * finishes the request, but nobody should have to discover that.
   */
  const signInNote = user === null ? "Sign in to make this card. What you type here is kept." : null;

  const formDescription = signInNote ?? lowAllowanceNote ?? DESTINATION_COPY[destination].promiseLine;

  return (
    <Form
      isLoading={isAuthLoading || isSubmitting}
      navigationTitle="Generate"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={DESTINATION_COPY[destination].submitTitle}
            icon={Icon.Stars}
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser title="Open My Requests" icon={Icon.List} url={buildMyRequestsUrl(destination)} />
          <AccountActionSection
            user={user ?? null}
            subscriptionState={subscriptionState}
            onSignIn={promptSignIn}
            onSignOut={signOut}
          />
          <AppsActionSection />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="destination"
        title="Dictionary"
        value={destination}
        onChange={(nextDestination) => setDestination(nextDestination as CardRequestDestination)}
      >
        {DICTIONARY_DESTINATIONS.map((destinationOption) => (
          <Form.Dropdown.Item
            key={destinationOption}
            value={destinationOption}
            title={DESTINATION_COPY[destinationOption].label}
            icon={DESTINATION_COPY[destinationOption].icon}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="word"
        title="Word"
        placeholder="A word the dictionary doesn't have"
        value={word}
        onChange={setWord}
        autoFocus={initialWord === undefined}
      />

      {/* Reason: a word handed over by a search miss is already known, so the
          cursor starts on the one thing still missing. */}
      <Form.TextArea
        id="meaning"
        title="Meaning"
        placeholder={MEANING_PLACEHOLDER}
        value={meaning}
        onChange={setMeaning}
        autoFocus={initialWord !== undefined}
      />

      <Form.Description text={formDescription} />
    </Form>
  );
}
