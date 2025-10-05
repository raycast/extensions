import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type Stripe from "stripe";
import { useStripeApi, useStripeDashboard } from "./hooks";
import { 
  convertTimestampToDate, 
  titleCase, 
  formatAmount, 
  getCustomerId, 
  getPaymentIntentIcon, 
  getPaymentIntentStatusDescription, 
  paymentIntentRequiresAction 
} from "./utils";
import { STRIPE_ENDPOINTS } from "./enums";
import { ListContainer, withEnvContext } from "./components";

const PaymentIntentActions = ({ 
  paymentIntent, 
  dashboardUrl 
}: { 
  paymentIntent: Stripe.PaymentIntent; 
  dashboardUrl: string; 
}) => {
  const customerId = getCustomerId(paymentIntent.customer);

  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="View in Stripe Dashboard"
        url={`${dashboardUrl}/payments/${paymentIntent.id}`}
        icon={Icon.Globe}
      />
      {customerId && (
        <Action.OpenInBrowser
          title="View Customer"
          url={`${dashboardUrl}/customers/${customerId}`}
          icon={Icon.Person}
        />
      )}
      <Action.CopyToClipboard
        title="Copy Payment Intent ID"
        content={paymentIntent.id}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Amount"
        content={formatAmount(paymentIntent.amount, paymentIntent.currency)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      />
      {customerId && (
        <Action.CopyToClipboard
          title="Copy Customer ID"
          content={customerId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        />
      )}
    </ActionPanel>
  );
};

const PaymentIntentDetail = ({ paymentIntent }: { paymentIntent: Stripe.PaymentIntent }) => {
  const { icon, color } = getPaymentIntentIcon(paymentIntent.status);
  const customerId = getCustomerId(paymentIntent.customer);
  const hasMetadata = Object.keys(paymentIntent.metadata || {}).length > 0;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={getPaymentIntentStatusDescription(paymentIntent.status)}
            icon={{ source: icon, tintColor: color as Color.ColorLike }}
          />
          {paymentIntent.description && (
            <List.Item.Detail.Metadata.Label title="Description" text={paymentIntent.description} />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Payment Details" />
          <List.Item.Detail.Metadata.Label
            title="Amount"
            text={formatAmount(paymentIntent.amount, paymentIntent.currency)}
          />
          {paymentIntent.amount_received > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Amount Received"
              text={formatAmount(paymentIntent.amount_received, paymentIntent.currency)}
            />
          )}
          {paymentIntent.amount_capturable > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Amount Capturable"
              text={formatAmount(paymentIntent.amount_capturable, paymentIntent.currency)}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={convertTimestampToDate(paymentIntent.created)}
          />
          {paymentIntent.canceled_at && (
            <List.Item.Detail.Metadata.Label
              title="Canceled At"
              text={convertTimestampToDate(paymentIntent.canceled_at)}
            />
          )}

          {paymentIntent.payment_method && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Payment Method" />
              <List.Item.Detail.Metadata.Label
                title="Method ID"
                text={typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : paymentIntent.payment_method.id}
              />
            </>
          )}

          {customerId && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Customer" />
              <List.Item.Detail.Metadata.Label title="Customer ID" text={customerId} />
            </>
          )}

          {hasMetadata && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Custom Metadata" />
              {Object.entries(paymentIntent.metadata).map(([key, value]) => (
                <List.Item.Detail.Metadata.Label key={key} title={titleCase(key)} text={value ?? ""} />
              ))}
            </>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Identifiers" />
          <List.Item.Detail.Metadata.Label title="Payment Intent ID" text={paymentIntent.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const PaymentIntentItem = ({ 
  paymentIntent, 
  dashboardUrl 
}: { 
  paymentIntent: Stripe.PaymentIntent; 
  dashboardUrl: string; 
}) => {
  const { icon, color } = getPaymentIntentIcon(paymentIntent.status);
  const title = paymentIntent.description || getPaymentIntentStatusDescription(paymentIntent.status);
  const subtitle = formatAmount(paymentIntent.amount, paymentIntent.currency);

  return (
    <List.Item
      key={paymentIntent.id}
      title={title}
      subtitle={subtitle}
      icon={{ source: icon, tintColor: color as Color.ColorLike }}
      actions={<PaymentIntentActions paymentIntent={paymentIntent} dashboardUrl={dashboardUrl} />}
      detail={<PaymentIntentDetail paymentIntent={paymentIntent} />}
    />
  );
};

const PaymentIntents = () => {
  const { isLoading, data } = useStripeApi(STRIPE_ENDPOINTS.PAYMENT_INTENTS, true);
  const { dashboardUrl } = useStripeDashboard();
  const paymentIntents = data as Stripe.PaymentIntent[];

  // Group by status
  const actionRequired = paymentIntents.filter(pi => paymentIntentRequiresAction(pi.status));
  const processing = paymentIntents.filter(pi => pi.status === "processing");
  const succeeded = paymentIntents.filter(pi => pi.status === "succeeded");
  const canceled = paymentIntents.filter(pi => pi.status === "canceled");
  const other = paymentIntents.filter(
    pi => !paymentIntentRequiresAction(pi.status) && 
         pi.status !== "processing" && 
         pi.status !== "succeeded" && 
         pi.status !== "canceled"
  );

  return (
    <ListContainer isLoading={isLoading} isShowingDetail={!isLoading}>
      {actionRequired.length > 0 && (
        <List.Section title={`⚠️ Action Required (${actionRequired.length})`}>
          {actionRequired.map((pi) => (
            <PaymentIntentItem key={pi.id} paymentIntent={pi} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}

      {processing.length > 0 && (
        <List.Section title={`⏳ Processing (${processing.length})`}>
          {processing.map((pi) => (
            <PaymentIntentItem key={pi.id} paymentIntent={pi} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}

      {succeeded.length > 0 && (
        <List.Section title={`✅ Completed (${succeeded.length})`}>
          {succeeded.map((pi) => (
            <PaymentIntentItem key={pi.id} paymentIntent={pi} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}

      {canceled.length > 0 && (
        <List.Section title={`❌ Canceled (${canceled.length})`}>
          {canceled.map((pi) => (
            <PaymentIntentItem key={pi.id} paymentIntent={pi} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}

      {other.length > 0 && (
        <List.Section title={`Other (${other.length})`}>
          {other.map((pi) => (
            <PaymentIntentItem key={pi.id} paymentIntent={pi} dashboardUrl={dashboardUrl} />
          ))}
        </List.Section>
      )}
    </ListContainer>
  );
};

export default withEnvContext(PaymentIntents);
