import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { BILLING_URL, PLANS_URL, SETTINGS_URL } from "../constants";
import { canManageBilling } from "../lib/subscription";
import type { SubscriptionState } from "../lib/subscription";
import type { User } from "@supabase/supabase-js";

type AccountActionSectionProps = {
  /** The signed-in account, or null for a visitor. */
  user: User | null;
  subscriptionState: SubscriptionState | undefined;
  onSignIn: () => void;
  onSignOut: () => Promise<void>;
};

type PlanAction = { title: string; url: string; icon: Icon };

/**
 * The one plan action for the account's state. Everything beyond a first
 * upgrade happens in the web app's Plan & Billing hub, so the action just
 * names what the user will do there.
 */
function _describePlanAction(state: SubscriptionState): PlanAction {
  if (state.isPastDue) return { title: "Fix Payment", url: BILLING_URL, icon: Icon.Warning };
  if (state.scheduledTier === "free") return { title: "Resume Subscription", url: BILLING_URL, icon: Icon.Redo };
  if (canManageBilling(state)) return { title: "Manage Subscription", url: BILLING_URL, icon: Icon.CreditCard };
  return { title: "Upgrade Plan", url: PLANS_URL, icon: Icon.Stars };
}

/** The one plan action for the account, shown once the plan has been read. */
function PlanActionItem({ state }: { state: SubscriptionState }) {
  const planAction = _describePlanAction(state);
  return <Action.OpenInBrowser title={planAction.title} icon={planAction.icon} url={planAction.url} />;
}

/**
 * Account email, one plan action, and sign-out, shown in the ActionPanel only
 * when signed in. Both links lead into the Inoh web app, because that is where
 * an account is changed: the email opens Settings, and the plan action opens
 * the page that matches the account's state — free users get "Upgrade Plan"
 * (the plans page); subscribers, accounts with a pending change, and
 * `past_due` accounts that must fix their card go to Plan & Billing. The plan
 * action does not show until the plan has been read at least once.
 *
 * A visitor gets the section too, holding the one account action they can
 * take. Reason: searching is free and needs no account, so someone can arrive
 * anywhere in the extension signed out, and every panel carrying this section
 * is then a way in rather than a dead end.
 */
export function AccountActionSection({ user, subscriptionState, onSignIn, onSignOut }: AccountActionSectionProps) {
  async function handleSignOut() {
    try {
      await onSignOut();
      await showToast({ style: Toast.Style.Success, title: "Signed out" });
    } catch (signOutError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't sign out",
        message: (signOutError as Error).message,
      });
    }
  }

  if (user === null) {
    return (
      <ActionPanel.Section title="Account">
        <Action title="Sign In" icon={Icon.Key} onAction={onSignIn} />
      </ActionPanel.Section>
    );
  }

  return (
    <ActionPanel.Section title="Account">
      <Action.OpenInBrowser title={user.email ?? "Account"} icon={Icon.Person} url={SETTINGS_URL} />
      {subscriptionState && <PlanActionItem state={subscriptionState} />}
      <Action title="Sign Out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={handleSignOut} />
    </ActionPanel.Section>
  );
}
