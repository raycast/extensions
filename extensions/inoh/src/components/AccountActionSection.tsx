import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { BILLING_URL, PLANS_URL } from "../constants";
import { canManageBilling } from "../lib/subscription";
import type { SubscriptionState } from "../lib/subscription";
import type { User } from "@supabase/supabase-js";

type AccountActionSectionProps = {
  user: User;
  subscriptionState: SubscriptionState | undefined;
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

/**
 * Account email, one plan action, and sign-out, shown in the ActionPanel only
 * when signed in. Plans are upgraded and managed in the Inoh web app: free
 * users get "Upgrade Plan" (the plans page); subscribers, accounts with a
 * pending change, and `past_due` accounts that must fix their card go to
 * Plan & Billing. Neither shows until the plan has been read at least once.
 */
function PlanActionItem({ state }: { state: SubscriptionState }) {
  const planAction = _describePlanAction(state);
  return <Action.OpenInBrowser title={planAction.title} icon={planAction.icon} url={planAction.url} />;
}

export function AccountActionSection({ user, subscriptionState, onSignOut }: AccountActionSectionProps) {
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

  return (
    <ActionPanel.Section title="Account">
      <Action.CopyToClipboard title={user.email ?? "Account"} content={user.email ?? ""} icon={Icon.Person} />
      {subscriptionState && <PlanActionItem state={subscriptionState} />}
      <Action title="Sign Out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={handleSignOut} />
    </ActionPanel.Section>
  );
}
