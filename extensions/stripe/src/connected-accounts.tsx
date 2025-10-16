import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import omit from "lodash/omit";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { convertTimestampToDate, titleCase, resolveMetadataValue } from "./utils";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

type ConnectedAccount = {
  id: string;
  created: string;
  first_name: string;
  last_name: string;
  email: string;
  capabilities: string;
  default_currency: string;
  company_address: string;
  dob: string;
};

const omittedFields = ["client_secret"];

const createDateOfBirth = (connectedAccount: Stripe.Account) => {
  const year = connectedAccount.individual?.dob?.year ?? "";
  const month = connectedAccount.individual?.dob?.month ?? "";
  const day = connectedAccount.individual?.dob?.day ?? "";

  if (!year || !month || !day) {
    return "";
  }

  return `${day}/${month}/${year}`;
};

const resolveConnectedAccount = (connectedAccount: Stripe.Account): ConnectedAccount => {
  const { city, country, line1, postal_code, state } = connectedAccount.company?.address ?? {};
  const companyAddress = [line1, city, state, postal_code, country].filter(Boolean).join(", ");

  const resolvedConnectedAccount: ConnectedAccount = {
    ...connectedAccount,
    default_currency: connectedAccount.default_currency?.toUpperCase() ?? "",
    created: connectedAccount.created ? convertTimestampToDate(connectedAccount.created) : "",
    dob: createDateOfBirth(connectedAccount),
    company_address: companyAddress,
    capabilities: Object.keys(connectedAccount.capabilities ?? {}).join(", "),
    first_name: titleCase(connectedAccount.individual?.first_name ?? ""),
    last_name: titleCase(connectedAccount.individual?.last_name ?? ""),
    email: connectedAccount.email ?? "",
  };

  return resolvedConnectedAccount;
};

const ConnectedAccounts = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.CONNECTED_ACCOUNTS, true);
  const { dashboardUrl } = useStripeDashboard();
  const formattedConnectedAccounts = (data as Stripe.Account[]).map(resolveConnectedAccount);

  const renderConnectedAccounts = (connectedAccount: ConnectedAccount) => {
    const { email, id } = connectedAccount;
    const fields = omit(connectedAccount, omittedFields);

    return (
      <List.Item
        key={id}
        title={email}
        icon={{ source: Icon.Person, tintColor: Color.PrimaryText }}
        actions={
          <ActionPanel title="Actions">
            <Action.OpenInBrowser title="View Connected Account" url={`${dashboardUrl}/connect/accounts/${id}`} />
            <Action.CopyToClipboard title="Copy Connected Account ID" content={id} />
            <Action.CopyToClipboard title="Copy Connected Account Email" content={email} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Metadata" />
                <List.Item.Detail.Metadata.Separator />
                {Object.entries(fields).map(([type, value]) => {
                  const resolvedValue = resolveMetadataValue(value);
                  if (!resolvedValue) return null;

                  return <List.Item.Detail.Metadata.Label key={type} title={titleCase(type)} text={resolvedValue} />;
                })}
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  };

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Connected Accounts">{formattedConnectedAccounts.map(renderConnectedAccounts)}</List.Section>
    </ListContainer>
  );
};

export default withEnvContext(ConnectedAccounts);
