import { List } from "@raycast/api";
import { Account, CustomField } from "recurly";

const Label = List.Item.Detail.Metadata.Label;

export default function AccountDetail({ account }: { account: Account }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <Label title="Account State" text={account.state || ""} icon={account.state || ""} />

          <List.Item.Detail.Metadata.Separator />

          <Label title="Account Information" />
          <Label title="Account Code" text={account.code || ""} />
          <Label title="ID" text={account.id || ""} />
          <Label title="Email" text={account.email || ""} />
          <Label title="Tax Exempt?" text={account.taxExempt ? "Yes" : "No"} />

          <List.Item.Detail.Metadata.Separator />

          <Label title="Billing Info" />
          <Label title="Full Name" text={formatBillingName(account)} />
          <Label title="Credit Card" text={formatCreditCard(account)} />
          <Label title="Expiration" text={formatBillingExpiration(account)} />
          <Label title="Address" text={formatBillingAddress(account)} />
          <Label title="IP Address" text={formatIPAddress(account)} />

          <List.Item.Detail.Metadata.Separator />

          <Label title="Created at" text={formatDateTime(account.createdAt)} />
          <Label title="Updated at" text={formatDateTime(account.updatedAt)} />

          <List.Item.Detail.Metadata.Separator />

          {formatCustomFields(account.customFields)}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

const formatIPAddress = (account: Account) =>
  `${account.billingInfo?.updatedBy?.ip} (${account.billingInfo?.updatedBy?.country})`;

const formatBillingAddress = (account: Account) => {
  return [
    account.billingInfo?.address?.country,
    account.billingInfo?.address?.region,
    account.billingInfo?.address?.city,
    account.billingInfo?.address?.street1,
    account.billingInfo?.address?.postalCode,
    account.billingInfo?.address?.street2,
  ]
    .filter((item) => item && item !== "N/A")
    .join(", ");
};

const formatBillingExpiration = (account: Account) => {
  return `${account.billingInfo?.paymentMethod?.expMonth}/${account.billingInfo?.paymentMethod?.expYear}`;
};

export const formatDateTime = (date: Date | null | undefined) =>
  date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : undefined;

const formatBillingName = (account: Account) =>
  [account.billingInfo?.firstName, account.billingInfo?.lastName].filter((value) => value).join(" ");

const formatCreditCard = (account: Account) =>
  `${account.billingInfo?.paymentMethod?.cardType} ${account.billingInfo?.paymentMethod?.lastFour}`;

export const formatCustomFields = (customFields: CustomField[] | null | undefined) =>
  customFields &&
  customFields.length > 0 &&
  customFields.map(({ name, value }) => <Label key={name} title={name || ""} text={value || "<no value>"} />);

export const formatSubscriptionEmoji = (account: Account) =>
  account.hasActiveSubscription
    ? "🟢"
    : account.hasCanceledSubscription
    ? "🟡"
    : account.hasPausedSubscription
    ? "🟣"
    : account.hasFutureSubscription
    ? "🔵"
    : "⚪";
