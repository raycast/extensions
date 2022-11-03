import React from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import get from "lodash/get";
import omit from "lodash/omit";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { convertTimestampToDate, titleCase, resolveMetadataValue } from "./utils";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

type ConnectedAccountResp = {
  id: string;
  created: number;
  cancelled_at: number | null;
  currency: string;
  status: string;
  business_profile: any;
  capabilities: any;
  default_currency: string;
  company: {
    address: {
      city: string | null;
      country: string | null;
      line1: string | null;
      line2: string | null;
      postal_code: string | null;
      state: string | null;
    };
  };
  individual: {
    first_name: string;
    last_name: string;
    email: string;
    dob: {
      day: number;
      month: number;
      year: number;
    };
  };
};

type ConnectedAccount = {
  id: string;
  email: string;
  created_at: string;
  first_name: string;
  last_name: string;
  cancelled_at: string;
  currency: string;
  capabilities: string;
  default_currency: string;
  company_address: string;
  dob: string;
};

const omittedFields = ["client_secret"];

const resolveConnectedAccount = ({
  currency = "",
  default_currency = "",
  created,
  cancelled_at,
  ...rest
}: ConnectedAccountResp): ConnectedAccount => {
  const { month, year, day } = get(rest, "individual.dob", {});
  const dateOfBirth = day && month && year ? `${day}/${month}/${year}` : "";
  const { city, country, line1, postal_code, state } = get(rest, "company.address", {});
  const companyAddress = [line1, city, state, postal_code, country].filter(Boolean).join(", ");

  return {
    ...rest,
    currency: currency.toUpperCase(),
    default_currency: default_currency.toUpperCase(),
    created_at: convertTimestampToDate(created),
    cancelled_at: convertTimestampToDate(cancelled_at),
    dob: dateOfBirth,
    company_address: companyAddress,
    capabilities: Object.keys(get(rest, "capabilities", {})).join(", "),
    first_name: titleCase(get(rest, "individual.first_name", "")),
    last_name: titleCase(get(rest, "individual.last_name", "")),
    email: get(rest, "email", ""),
  };
};

const ConnectedAccounts = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.CONNECTED_ACCOUNTS, true);
  const { dashboardUrl } = useStripeDashboard();
  const formattedConnectedAccounts = data.map(resolveConnectedAccount);

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
