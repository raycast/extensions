import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDefinitionField } from "../hooks/useDefinitionField";
import { usePrivateCardQuota } from "../hooks/usePrivateCardQuota";
import { useSubscriptionState } from "../hooks/useSubscriptionState";
import { requestCard } from "../lib/card-request-generate";
import { describeLowAllowance } from "../lib/private-card-quota";
import { INITIAL_DESTINATION } from "../lib/card-request-drafts";
import { buildMyRequestsUrl } from "../lib/web-app-urls";
import { DESTINATION_COPY, DICTIONARY_DESTINATIONS } from "../lib/destination-copy";
import { buildAskKey, findMissingFieldTitle, reportHeld, reportQueued, reportRefusal } from "../lib/generate-form-copy";
import { SUGGESTED_DEFINITION_NOTE, SUGGESTED_DEFINITION_TAG } from "../lib/definition-suggestion";
import { AccountActionSection } from "./AccountActionSection";
import { AppsActionSection } from "./AppsActionSection";
import { SignInView } from "./SignInView";
import type { CardRequestDestination } from "../types";
import type { User } from "@supabase/supabase-js";

/**
 * Generate — a word the dictionary does not have, the definition its card should
 * teach, and which dictionary it is headed for.
 *
 * It exists for the same reason the web app's Generate tab does: making a card
 * used to be reachable only by searching for something and failing to find it,
 * so discovering it required failing first.
 *
 * The definition is asked for rather than guessed. A word alone is not enough to
 * generate from — "spring" has several senses and a card teaches one — which
 * is why the database refuses a request that carries none. A search that found
 * nothing hands its word over, so only the definition is left to type.
 */
export function GenerateCardForm({ initialWord }: { initialWord?: string }) {
  const { user, isLoading: isAuthLoading, refresh: refreshAuth, signOut } = useAuth();
  const { subscriptionState } = useSubscriptionState(user?.id ?? null);
  const { privateCardQuota, revalidatePrivateCardQuota } = usePrivateCardQuota(user !== null);
  const [destination, setDestination] = useState<CardRequestDestination>(INITIAL_DESTINATION);
  const [word, setWord] = useState(initialWord ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  /**
   * The word and definition Inoh was last shown to have a card for.
   *
   * Reason: having been shown the card is what turns the next press into
   * "yes, anyway", the same way the web dialog relabels its button. Editing
   * either field makes it a different ask, so the key stops matching and the
   * check runs again.
   */
  const [heldAskKey, setHeldAskKey] = useState<string | null>(null);

  const { definition, setDefinition, definitionPlaceholder, isStillSuggested } = useDefinitionField(
    word,
    user !== null,
  );
  const { push, pop } = useNavigation();

  // Reason: the button says what the next press will do. Once the card has
  // been shown, the next press goes ahead in spite of it, and the label is the
  // only thing that says so. Mirrors the web dialog, which relabels the same way.
  const isHoldingThisAsk = heldAskKey === buildAskKey(word, definition);
  const goAheadTitle = DESTINATION_COPY[destination].goAheadAnywayTitle;
  const submitTitle = isHoldingThisAsk ? goAheadTitle : DESTINATION_COPY[destination].submitTitle;

  /** Nothing here reaches the database without an account, so this is the way in. */
  function promptSignIn(afterSignIn?: (signedInUser: User) => Promise<void>) {
    // Reason: submission belongs to this sign-in attempt. Backing out discards
    // its callback, so a later Account sign-in cannot submit an abandoned form.
    let hasResumed = false;
    push(
      <SignInView
        onAuthenticated={async (signedInUser) => {
          if (hasResumed) return;
          hasResumed = true;
          await refreshAuth();
          pop();
          await afterSignIn?.(signedInUser);
        }}
      />,
    );
  }

  async function handleSubmit() {
    const missingFieldTitle = findMissingFieldTitle(word, definition);
    if (missingFieldTitle !== null) {
      await showToast({ style: Toast.Style.Failure, title: missingFieldTitle });
      return;
    }

    // Reason: the account is needed for the row, not for the form, so the
    // sign-in step comes after the user has said what they want. What they
    // typed survives the sign-in view, which is pushed over this form rather
    // than replacing it, and this sign-in attempt finishes the submit for them.
    if (!user) {
      promptSignIn((signedInUser) => _requestCardFor(signedInUser.id));
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
      title: `${submitTitle}...`,
    });
    setIsSubmitting(true);
    const requestResult = await requestCard(userId, word, definition, destination, isHoldingThisAsk);
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
      reportRefusal(toast, requestResult, isUpgradeOffered);
      return;
    }

    if (requestResult.status === "held") {
      // Reason: the form keeps what was typed. The next move is either to go
      // ahead or to reword the definition, and both need the fields as they are.
      setHeldAskKey(buildAskKey(word, definition));
      reportHeld(toast, requestResult, goAheadTitle);
      return;
    }

    // The form empties itself so the next word can be typed straight into it.
    setWord("");
    setDefinition("");
    setHeldAskKey(null);
    // Reason: only a card that was actually asked for spends the allowance.
    revalidatePrivateCardQuota();

    reportQueued(toast, destination);
  }

  // Reason: only the private side has a monthly allowance to run out of.
  const lowAllowanceNote = destination === "private" ? describeLowAllowance(privateCardQuota?.remaining ?? null) : null;

  /**
   * Reason: the tally replaces the standing promise rather than joining it, as
   * it does in the web app. Once the allowance is nearly gone, how soon the
   * card arrives matters less than whether there is one left to make.
   */
  /**
   * Reason: a visitor is told about the account before typing a definition, not
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
          <Action.SubmitForm title={submitTitle} icon={Icon.Stars} onSubmit={handleSubmit} />
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
        id="definition"
        title="Definition"
        placeholder={definitionPlaceholder}
        value={definition}
        onChange={setDefinition}
        autoFocus={initialWord !== undefined}
      />

      {/* Reason: text that appeared in the field on its own is otherwise
          indistinguishable from text the user typed. The note goes as soon as
          they change a character. */}
      {isStillSuggested && <Form.Description title={SUGGESTED_DEFINITION_TAG} text={SUGGESTED_DEFINITION_NOTE} />}

      <Form.Description text={formDescription} />
    </Form>
  );
}
