import {List} from "@raycast/api";
import {Account} from "recurly";

// noinspection JSUnusedGlobalSymbols
export default function AccountDetail({account}: { account: Account }) {
  return <List.Item.Detail markdown={accountMarkdown(account)}/>
}

const accountMarkdown = (account: Account) => `
# ${formatSubscriptionEmoji(account)} ${formatTitle(account)}
---

${account.email || 'No email'}, ${account.code || 'code not set'}, ${account.id}

${formatName(account)}

Created at ${localeDateTime(account.createdAt)}

Last updated at ${localeDateTime(account.updatedAt)}

${formatBillingInfo(account)}

---

${formatCustomFields(account)}

---

${JSON.stringify(account)}`

const formatTitle = (account: Account) =>
  account.email || account.code || account.id

const localeDateTime = (date: Date | null | undefined) =>
  date
    ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    : undefined;

const formatName = (account: Account) =>
  account.firstName && account.lastName
    ? `${account.firstName} ${account.lastName}`
    : account.firstName
      ? account.firstName
      : account.lastName
        ? account.lastName
        : 'Name not set';

const formatCustomFields = (account: Account) =>
  account.customFields && account.customFields.length > 0
    ? account.customFields.map(({name, value}) => `${name}: ${value}`).join("\n\n")
    : 'No custom fields set';

const formatBillingInfo = (account: Account) =>
  account.billingInfo
    ? `## Billing info

${account.billingInfo.firstName} ${account.billingInfo.lastName}

Credit card ${account.billingInfo.paymentMethod?.cardType}

Expiration ${account.billingInfo.paymentMethod?.expMonth} / ${account.billingInfo.paymentMethod?.expYear}

Address ${[
      account.billingInfo.address?.country,
      account.billingInfo.address?.region,
      account.billingInfo.address?.city,
      account.billingInfo.address?.street1,
      account.billingInfo.address?.postalCode,
      account.billingInfo.address?.street2,
    ].filter(item => item && item !== 'N/A').join(', ')}
    
IP ${account.billingInfo.updatedBy?.ip} (${account.billingInfo.updatedBy?.country})`
    : 'No billing info set';

export const formatSubscriptionEmoji = (account: Account) =>
  account.hasActiveSubscription
    ? '🟢'
    : account.hasCanceledSubscription
      ? '🟡'
      : account.hasPausedSubscription
        ? '🟣'
        : account.hasFutureSubscription
          ? '🔵'
          : '⚪';