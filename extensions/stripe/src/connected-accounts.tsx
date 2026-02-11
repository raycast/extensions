import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard, useProfileContext } from "@src/hooks";
import { convertTimestampToDate, titleCase, formatBillingAddress } from "@src/utils";
import { STRIPE_ENDPOINTS } from "@src/enums";
import { ListContainer, withProfileContext, ProfileSwitcherActions } from "@src/components";
import { SHORTCUTS } from "@src/constants/keyboard-shortcuts";

/**
 * Formats date of birth object into DD/MM/YYYY string.
 */
const formatDateOfBirth = (dob?: { day: number | null; month: number | null; year: number | null }) => {
  if (!dob?.year || !dob?.month || !dob?.day) return "";
  return `${dob.day}/${dob.month}/${dob.year}`;
};

/**
 * Returns icon and color based on account capabilities.
 * Green check = fully enabled, yellow = charges only, orange = limited.
 */
const getAccountIcon = (account: Stripe.Account): { icon: Icon; color: Color } => {
  if (account.charges_enabled && account.payouts_enabled) {
    return { icon: Icon.CheckCircle, color: Color.Green };
  }
  if (account.charges_enabled) {
    return { icon: Icon.Circle, color: Color.Yellow };
  }
  return { icon: Icon.Circle, color: Color.Orange };
};

/**
 * Action panel for connected account items.
 * Provides navigation to Stripe Dashboard and copy actions for account ID and email.
 */
const AccountActions = ({ account, dashboardUrl }: { account: Stripe.Account; dashboardUrl: string }) => (
  <ActionPanel>
    <Action.OpenInBrowser
      title="View in Stripe Dashboard"
      url={`${dashboardUrl}/connect/accounts/${account.id}`}
      icon={Icon.Globe}
    />
    <Action.CopyToClipboard title="Copy Account ID" content={account.id} shortcut={SHORTCUTS.COPY_PRIMARY} />
    {account.email && (
      <Action.CopyToClipboard title="Copy Email" content={account.email} shortcut={SHORTCUTS.COPY_SECONDARY} />
    )}
    <ProfileSwitcherActions />
  </ActionPanel>
);

/**
 * Detailed view of a connected account.
 * Shows status, capabilities, individual/company details, and account settings.
 */
const AccountDetail = ({ account }: { account: Stripe.Account }) => {
  const { icon, color } = getAccountIcon(account);
  const companyAddress = formatBillingAddress(account.company?.address);
  const dob = formatDateOfBirth(account.individual?.dob);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={account.charges_enabled && account.payouts_enabled ? "Fully Enabled" : "Limited"}
            icon={{ source: icon, tintColor: color }}
          />
          <List.Item.Detail.Metadata.Label title="Type" text={titleCase(account.type || "standard")} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Capabilities" />
          <List.Item.Detail.Metadata.Label title="Charges" text={account.charges_enabled ? "Enabled" : "Disabled"} />
          <List.Item.Detail.Metadata.Label title="Payouts" text={account.payouts_enabled ? "Enabled" : "Disabled"} />
          {account.capabilities && Object.keys(account.capabilities).length > 0 && (
            <List.Item.Detail.Metadata.Label title="Available" text={Object.keys(account.capabilities).join(", ")} />
          )}

          {(account.individual || account.company) && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={account.individual ? "Individual Details" : "Company Details"} />
              {account.individual?.first_name && (
                <List.Item.Detail.Metadata.Label
                  title="Name"
                  text={`${account.individual.first_name} ${account.individual.last_name || ""}`.trim()}
                />
              )}
              {account.company?.name && (
                <List.Item.Detail.Metadata.Label title="Company Name" text={account.company.name} />
              )}
              {account.email && <List.Item.Detail.Metadata.Label title="Email" text={account.email} />}
              {dob && <List.Item.Detail.Metadata.Label title="Date of Birth" text={dob} />}
              {companyAddress && <List.Item.Detail.Metadata.Label title="Address" text={companyAddress} />}
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Account Details" />
          {account.default_currency && (
            <List.Item.Detail.Metadata.Label title="Default Currency" text={account.default_currency.toUpperCase()} />
          )}
          {account.country && <List.Item.Detail.Metadata.Label title="Country" text={account.country} />}
          {account.created && (
            <List.Item.Detail.Metadata.Label title="Created" text={convertTimestampToDate(account.created)} />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Identifiers" />
          <List.Item.Detail.Metadata.Label title="Account ID" text={account.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

/**
 * List item for a single connected account.
 * Displays account name (individual or company), email/currency, and status indicator.
 */
const AccountItem = ({ account, dashboardUrl }: { account: Stripe.Account; dashboardUrl: string }) => {
  const { icon, color } = getAccountIcon(account);
  const name =
    account.individual?.first_name && account.individual?.last_name
      ? `${account.individual.first_name} ${account.individual.last_name}`
      : account.company?.name || account.email || account.id;

  const subtitle = account.email || account.default_currency?.toUpperCase();

  return (
    <List.Item
      key={account.id}
      title={name}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color }}
      actions={<AccountActions account={account} dashboardUrl={dashboardUrl} />}
      detail={<AccountDetail account={account} />}
    />
  );
};

/**
 * Connected Accounts View - Displays Stripe Connect accounts.
 *
 * Organizes accounts into sections:
 * - Fully Enabled: Accounts with both charges and payouts enabled
 * - Limited Access: Accounts with restricted capabilities
 *
 * Shows account details, status, capabilities, individual/company info, and settings.
 * Useful for managing Stripe Connect platform accounts and monitoring onboarding status.
 */
const ConnectedAccounts = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.CONNECTED_ACCOUNTS, { isList: true });
  const { dashboardUrl } = useStripeDashboard();
  const { activeProfile, activeEnvironment } = useProfileContext();
  const accounts = data as Stripe.Account[];

  // Group by status
  const fullyEnabledAccounts = accounts.filter((account) => account.charges_enabled && account.payouts_enabled);
  const limitedAccounts = accounts.filter((account) => !account.charges_enabled || !account.payouts_enabled);

  const profileLabel = activeProfile?.name ? ` - ${activeProfile.name}` : "";
  const envLabel = activeEnvironment === "test" ? " (Test)" : " (Live)";

  return (
    <ListContainer
      isLoading={isLoading}
      isShowingDetail={!isLoading}
      navigationTitle={`Connected Accounts${profileLabel}${envLabel}`}
      searchBarPlaceholder="Search accounts..."
    >
      {fullyEnabledAccounts.length > 0 && (
        <List.Section title={`Fully Enabled (${fullyEnabledAccounts.length})`}>
          {fullyEnabledAccounts.map((account) => (
            <AccountItem key={account.id} account={account} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}

      {limitedAccounts.length > 0 && (
        <List.Section title={`Limited Access (${limitedAccounts.length})`}>
          {limitedAccounts.map((account) => (
            <AccountItem key={account.id} account={account} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}
    </ListContainer>
  );
};

export default withProfileContext(ConnectedAccounts);
