import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { ACCOUNT_SETTINGS_URL, PLANS_URL } from "../constants";
import { canManageBilling } from "../lib/subscription";
import type { SubscriptionState } from "../lib/subscription";
import type { User } from "@supabase/supabase-js";

type AccountActionSectionProps = {
  user: User;
  subscriptionState: SubscriptionState | undefined;
  onSignOut: () => Promise<void>;
};

/**
 * Account email, one plan action, and sign-out, shown in the ActionPanel only
 * when signed in. Plans are upgraded and managed in the Inoh web app: free
 * users get "Upgrade Plan" (the plans page), while subscribers — and
 * `past_due` accounts that must fix their card — get "Manage Subscription"
 * (account settings, where the billing portal lives). Neither shows until
 * the plan has been read at least once.
 */
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
      {subscriptionState &&
        (canManageBilling(subscriptionState) ? (
          <Action.OpenInBrowser title="Manage Subscription" icon={Icon.CreditCard} url={ACCOUNT_SETTINGS_URL} />
        ) : (
          <Action.OpenInBrowser title="Upgrade Plan" icon={Icon.Stars} url={PLANS_URL} />
        ))}
      <Action title="Sign Out" icon={Icon.Logout} style={Action.Style.Destructive} onAction={handleSignOut} />
    </ActionPanel.Section>
  );
}
