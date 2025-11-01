import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import omit from "lodash/omit";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { STRIPE_ENDPOINTS } from "./enums";
import { convertAmount, convertTimestampToDate, titleCase, resolveMetadataValue } from "./utils";
import { ListContainer, withEnvContext } from "./components";

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

const createBillingAddress = (charge: Stripe.Charge): string => {
  const line1 = charge.billing_details.address?.line1;
  const city = charge.billing_details.address?.city;
  const state = charge.billing_details.address?.state;
  const postal_code = charge.billing_details.address?.postal_code;
  const country = charge.billing_details.address?.country;

  const billingAddress = [line1, city, state, postal_code, country].filter(Boolean).join(", ");
  return billingAddress;
};

const getPaymentIntentId = (charge: Stripe.Charge): string => {
  if (charge.payment_intent === null) {
    return "";
  }

  if (typeof charge.payment_intent === "string") {
    return charge.payment_intent;
  }

  if (typeof charge.payment_intent === "object") {
    return charge.payment_intent.id;
  }

  return "";
};

const resolveCharge = (charge: Stripe.Charge): Charge => {
  const resolvedCharge: Charge = {
    ...charge,
    amount: convertAmount(charge.amount),
    amount_captured: convertAmount(charge.amount_captured),
    amount_refunded: convertAmount(charge.amount_refunded),
    payment_intent: getPaymentIntentId(charge),
    currency: charge.currency.toUpperCase(),
    description: charge.description ?? "",
    receipt_url: charge.receipt_url ?? "",
    created_at: convertTimestampToDate(charge.created),
    billing_address: createBillingAddress(charge),
    billing_email: charge.billing_details.email ?? "",
    billing_name: charge.billing_details.name ?? "",
    payment_method_type: charge.payment_method_details?.type ?? "",
    payment_method_brand: charge.payment_method_details?.card?.brand ?? "",
    payment_method_last4: charge.payment_method_details?.card?.last4 ?? "",
    payment_method_exp_month: String(charge.payment_method_details?.card?.exp_month ?? ""),
    payment_method_exp_year: String(charge.payment_method_details?.card?.exp_year ?? ""),
    payment_method_network: charge.payment_method_details?.card?.network ?? "",
    payment_method_three_d_secure: !!charge.payment_method_details?.card?.three_d_secure,
    payment_method_country: charge.payment_method_details?.card?.country ?? "",
  };

  return resolvedCharge;
};

const Charges = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.CHARGES, true);
  const { dashboardUrl } = useStripeDashboard();
  const formattedCharges = (data as Stripe.Charge[]).map(resolveCharge);

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
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      <List.Section title="Charges">{formattedCharges.map(renderCharges)}</List.Section>
    </ListContainer>
  );
};

export default withEnvContext(Charges);
