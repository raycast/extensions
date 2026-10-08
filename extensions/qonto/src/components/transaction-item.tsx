import { Icon, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { match } from "ts-pattern";
import { currency } from "../helpers/currency-format";
import { date } from "../helpers/date-format";
import { getAsset } from "../helpers/get-asset";
import { plural } from "../helpers/plural";
import { Membership } from "../types/membership";
import { Transaction } from "../types/transaction";

type Props = {
  transaction: Transaction;
  initiator?: Membership;
  actions: React.ReactNode;
};

export function TransactionItem({ transaction, initiator, actions }: Props) {
  const transactionIcon = match(transaction.operation_type)
    .with("card", () => ({ value: getAsset("icons/icon-card"), tooltip: "Card" }))
    .with("cheque", () => ({ value: getAsset("icons/icon-cheque"), tooltip: "Cheque" }))
    .with("recall", () => ({ value: getAsset("icons/icon-recall"), tooltip: "Recall" }))
    .with("income", () => ({ value: getAsset("icons/icon-income"), tooltip: "Transfert In" }))
    .with("qonto_fee", () => ({ value: getAsset("icons/icon-qonto-fee"), tooltip: "Qonto Fee" }))
    .with("transfer", () => ({ value: getAsset("icons/icon-transfert"), tooltip: "Transfert Out" }))
    .with("direct_debit", () => ({ value: getAsset("icons/icon-direct-debit"), tooltip: "SEPA Direct Debit" }))
    .with("swift_income", () => ({ value: getAsset("icons/icon-swift-income"), tooltip: "Swift Income" }))
    .exhaustive();

  const statusTag = match(transaction.status)
    .with("pending", () => ({ tag: "Pending" }))
    .with("declined", () => ({ tag: "Declined" }))
    .with("completed", () => null)
    .exhaustive();

  const initiatorIcon = initiator
    ? {
        icon: getAvatarIcon(`${initiator.first_name} ${initiator.last_name}`, {
          background: "#555555",
          gradient: false,
        }),
        tooltip: `Made by ${initiator.first_name} ${initiator.last_name}`,
      }
    : null;

  const noteIcon = transaction.note ? { icon: Icon.Document, tooltip: transaction.note } : null;

  const attachmentLength = transaction.attachment_ids.length;
  const attachmentIcon =
    transaction.attachment_ids.length > 0
      ? { icon: Icon.Paperclip, tooltip: `${attachmentLength} ${plural("Attachment", attachmentLength)}` }
      : null;

  const amountText =
    transaction.side === "credit"
      ? { text: `+${currency.format(transaction.amount)}` }
      : { text: `-${currency.format(transaction.amount)}` };

  const settledText = {
    text: `${date.format(transaction.settled_at)}`,
  };

  const accessories = [];
  if (statusTag) accessories.push(statusTag);
  if (initiatorIcon) accessories.push(initiatorIcon);
  if (noteIcon) accessories.push(noteIcon);
  if (attachmentIcon) accessories.push(attachmentIcon);
  accessories.push(amountText);
  accessories.push(settledText);

  return (
    <List.Item
      key={transaction.id}
      icon={transactionIcon}
      title={transaction.label}
      accessories={accessories}
      actions={actions}
    />
  );
}
