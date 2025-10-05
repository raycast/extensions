import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { STRIPE_ENDPOINTS } from "./enums";
import { 
  convertTimestampToDate, 
  titleCase, 
  formatAmount, 
  formatBillingAddress, 
  getPaymentIntentId, 
  getCustomerId, 
  getChargeIcon 
} from "./utils";
import { ListContainer, withEnvContext } from "./components";

const ChargeActions = ({
  charge,
  dashboardUrl
}: {
  charge: Stripe.Charge;
  dashboardUrl: string;
}) => {
  const paymentIntentId = getPaymentIntentId(charge.payment_intent);
  const customerId = getCustomerId(charge.customer);

  return (
    <ActionPanel>
      {paymentIntentId && (
        <Action.OpenInBrowser 
          title="View in Stripe Dashboard" 
          url={`${dashboardUrl}/payments/${paymentIntentId}`}
          icon={Icon.Globe}
        />
      )}
      {charge.receipt_url && (
        <Action.OpenInBrowser 
          title="View Receipt" 
          url={charge.receipt_url} 
          icon={Icon.Receipt}
        />
      )}
      {customerId && (
        <Action.OpenInBrowser 
          title="View Customer" 
          url={`${dashboardUrl}/customers/${customerId}`}
          icon={Icon.Person}
        />
      )}
      <Action.CopyToClipboard 
        title="Copy Charge ID" 
        content={charge.id}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {paymentIntentId && (
        <Action.CopyToClipboard 
          title="Copy Payment Intent ID" 
          content={paymentIntentId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      )}
      {charge.billing_details.email && (
        <Action.CopyToClipboard 
          title="Copy Customer Email" 
          content={charge.billing_details.email}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        />
      )}
      <Action.CopyToClipboard 
        title="Copy Amount" 
        content={formatAmount(charge.amount, charge.currency)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      />
    </ActionPanel>
  );
};

const ChargeDetail = ({ charge }: { charge: Stripe.Charge }) => {
  const card = charge.payment_method_details?.card;
  const billing = charge.billing_details;
  const billingAddress = formatBillingAddress(billing.address);
  const paymentIntentId = getPaymentIntentId(charge.payment_intent);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label 
            title="Status" 
            text={titleCase(charge.status)}
            icon={charge.status === "succeeded" ? Icon.CheckCircle : Icon.XMarkCircle}
          />
          {charge.disputed && (
            <List.Item.Detail.Metadata.Label 
              title="Disputed" 
              text="Yes"
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            />
          )}
          {charge.refunded && (
            <List.Item.Detail.Metadata.Label 
              title="Refund Status" 
              text="Fully Refunded"
              icon={{ source: Icon.ArrowUp, tintColor: Color.Red }}
            />
          )}
          {charge.description && (
            <List.Item.Detail.Metadata.Label title="Description" text={charge.description} />
          )}
          
          <List.Item.Detail.Metadata.Separator />
          
          <List.Item.Detail.Metadata.Label title="Payment Details" />
          <List.Item.Detail.Metadata.Label 
            title="Amount" 
            text={formatAmount(charge.amount, charge.currency)} 
          />
          {charge.amount_refunded > 0 && (
            <List.Item.Detail.Metadata.Label 
              title="Refunded" 
              text={formatAmount(charge.amount_refunded, charge.currency)} 
            />
          )}
          {charge.amount_captured < charge.amount && (
            <List.Item.Detail.Metadata.Label 
              title="Captured" 
              text={formatAmount(charge.amount_captured, charge.currency)} 
            />
          )}
          <List.Item.Detail.Metadata.Label 
            title="Created" 
            text={convertTimestampToDate(charge.created)} 
          />
          
          {card && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Payment Method" />
              <List.Item.Detail.Metadata.Label 
                title="Card" 
                text={`${titleCase(card.brand ?? "")} •••• ${card.last4}`} 
              />
              {card.exp_month && card.exp_year && (
                <List.Item.Detail.Metadata.Label 
                  title="Expires" 
                  text={`${card.exp_month}/${card.exp_year}`} 
                />
              )}
              {card.country && (
                <List.Item.Detail.Metadata.Label 
                  title="Country" 
                  text={card.country} 
                />
              )}
            </>
          )}
          
          {(billing.name || billing.email || billingAddress) && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Billing Details" />
              {billing.name && (
                <List.Item.Detail.Metadata.Label title="Name" text={billing.name} />
              )}
              {billing.email && (
                <List.Item.Detail.Metadata.Label title="Email" text={billing.email} />
              )}
              {billingAddress && (
                <List.Item.Detail.Metadata.Label title="Address" text={billingAddress} />
              )}
            </>
          )}
          
          <List.Item.Detail.Metadata.Separator />
          
          <List.Item.Detail.Metadata.Label title="Identifiers" />
          <List.Item.Detail.Metadata.Label title="Charge ID" text={charge.id} />
          {paymentIntentId && (
            <List.Item.Detail.Metadata.Label title="Payment Intent ID" text={paymentIntentId} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const ChargeItem = ({ charge, dashboardUrl }: { charge: Stripe.Charge; dashboardUrl: string }) => {
  const customerName = charge.billing_details.name || charge.billing_details.email;
  const title = charge.description || customerName || titleCase(charge.status);
  const { icon, color } = getChargeIcon(charge);
  
  // Build subtitle with refund info if applicable
  let subtitle = formatAmount(charge.amount, charge.currency);
  if (charge.refunded) {
    subtitle = `${subtitle} • Fully Refunded`;
  } else if (charge.amount_refunded > 0) {
    subtitle = `${subtitle} • Partially Refunded`;
  }
  
  // Add dispute indicator
  if (charge.disputed) {
    subtitle = `⚠️ Disputed • ${subtitle}`;
  }

  return (
    <List.Item
      key={charge.id}
      title={title}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color as Color.ColorLike }}
      actions={<ChargeActions charge={charge} dashboardUrl={dashboardUrl} />}
      detail={<ChargeDetail charge={charge} />}
    />
  );
};

const Charges = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.CHARGES, true);
  const { dashboardUrl } = useStripeDashboard();
  const charges = data as Stripe.Charge[];

  // Group charges by status for better organization
  const disputed = charges.filter(c => c.disputed);
  const failed = charges.filter(c => !c.disputed && c.status === "failed");
  const succeeded = charges.filter(c => !c.disputed && c.status === "succeeded");
  const other = charges.filter(c => !c.disputed && c.status !== "failed" && c.status !== "succeeded");

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      {disputed.length > 0 && (
        <List.Section title={`⚠️ Disputed (${disputed.length})`}>
          {disputed.map((charge) => (
            <ChargeItem key={charge.id} charge={charge} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}
      
      {failed.length > 0 && (
        <List.Section title={`Failed (${failed.length})`}>
          {failed.map((charge) => (
            <ChargeItem key={charge.id} charge={charge} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}
      
      <List.Section title={`Successful (${succeeded.length})`}>
        {succeeded.map((charge) => (
          <ChargeItem key={charge.id} charge={charge} dashboardUrl={dashboardUrl} />
        ))}
      </List.Section>
      
      {other.length > 0 && (
        <List.Section title={`Other (${other.length})`}>
          {other.map((charge) => (
            <ChargeItem key={charge.id} charge={charge} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}
    </ListContainer>
  );
};

export default withEnvContext(Charges);
