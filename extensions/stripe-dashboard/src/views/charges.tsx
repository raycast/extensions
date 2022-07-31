import React from "react";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import get from "lodash/get";
import omit from "lodash/omit";
import { useStripeApi, useStripeDashboard } from "../hooks";
import { ENDPOINTS } from "../enums";
import { convertAmount, convertTimestampToDate, titleCase, resolveMetadataValue } from "../utils";
import { withPropsContext } from "../components";

type ChargeResp = {
  id: string;
  amount: number;
  amount_captured: number;
  amount_refunded: number;
  payment_intent: string;
  created: number;
  currency: string;
  description: string | null;
  status: string;
  receipt_url: string | null;
  billing_details: {
    address: {
      city: string | null;
      country: string | null;
      line1: string | null;
      line2: string | null;
      postal_code: string | null;
      state: string | null;
    };
    email: string | null;
    name: string | null;
    phone: string | null;
  };
  payment_method_details: {
    card: {
      brand: string | null;
      country: string | null;
      exp_month: number;
      exp_year: number;
      last4: string;
      network: string | null;
      three_d_secure: null;
    };
    type: string;
  };
};

type Charge = {
  id: string;
  amount: number;
  amount_captured: number;
  amount_refunded: number;
  payment_intent: string;
  created_at: string;
  currency: string;
  description: string | null;
  receipt_url: string | null;
  billing_address: string;
  billing_email: string;
  billing_name: string;
  payment_method_type: string;
  payment_method_brand: string;
  payment_method_last4: string;
  payment_method_exp_month: string;
  payment_method_exp_year: string;
  payment_method_network: string;
  payment_method_three_d_secure: boolean;
  payment_method_country: string;
};

const omittedFields = ["receipt_url"];

const resolveCharge = ({
  amount = 0,
  amount_captured = 0,
  amount_refunded = 0,
  currency = "",
  description = "",
  created,
  ...rest
}: ChargeResp): Charge => {
  const uppercaseCurrency = currency.toUpperCase();
  const billingDetails = get(rest, "billing_details", {});
  const billingAddressObj = get(billingDetails, "address", {});
  const paymentMethodDetails = get(rest, "payment_method_details.card", {});
  const { city, country, line1, postal_code, state } = billingAddressObj;
  const billingAddress = [line1, city, state, postal_code, country].filter(Boolean).join(", ");

  return {
    ...rest,
    amount_captured: convertAmount(amount_captured),
    amount_refunded: convertAmount(amount_refunded),
    amount: convertAmount(amount),
    currency: uppercaseCurrency,
    description,
    created_at: convertTimestampToDate(created),
    billing_address: billingAddress,
    billing_email: get(billingDetails, "email", ""),
    billing_name: get(billingDetails, "name", ""),
    payment_method_type: get(paymentMethodDetails, "type", ""),
    payment_method_brand: get(paymentMethodDetails, "brand", ""),
    payment_method_last4: get(paymentMethodDetails, "last4", ""),
    payment_method_exp_month: get(paymentMethodDetails, "exp_month", ""),
    payment_method_exp_year: get(paymentMethodDetails, "exp_year", ""),
    payment_method_network: get(paymentMethodDetails, "network", ""),
    payment_method_three_d_secure: get(paymentMethodDetails, "three_d_secure", false),
    payment_method_country: get(paymentMethodDetails, "country", ""),
  };
};

const Charges = () => {
  const { isLoading, data: resp } = useStripeApi(ENDPOINTS.CHARGES);
  const { dashboardUrl } = useStripeDashboard();
  const chargesResp = get(resp, "data", []) as ChargeResp[];
  const formattedCharges = chargesResp.map(resolveCharge);

  const renderCharges = (charge: Charge) => {
    const { amount, currency, id, receipt_url, payment_intent } = charge;
    const fields = omit(charge, omittedFields);

    return (
      <List.Item
        key={id}
        title={`${currency} ${amount}`}
        icon={{ source: Icon.CreditCard, tintColor: Color.Red }}
        actions={
          <ActionPanel title="Actions">
            {payment_intent && (
              <Action.OpenInBrowser title="View Payment Intent" url={`${dashboardUrl}/payments/${payment_intent}`} />
            )}
            {receipt_url && <Action.OpenInBrowser title="View Receipt" url={receipt_url} />}
            <Action.CopyToClipboard title="Copy Charge ID" content={id} />
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
    <List isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Charges">{formattedCharges.map(renderCharges)}</List.Section>
    </List>
  );
};

export default withPropsContext(Charges);
