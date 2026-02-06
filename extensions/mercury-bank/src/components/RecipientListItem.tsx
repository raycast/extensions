import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { Recipient } from "../lib/types";
import { PAYMENT_METHOD_LABELS } from "../lib/constants";
import { formatDate, maskAccountNumber } from "../lib/utils";
import { AccountSwitcherActions } from "./AccountSwitcher";

interface RecipientListItemProps {
  recipient: Recipient;
  showDetail?: boolean;
  toggleDetail?: () => void;
  onSendMoney?: (recipient: Recipient) => void;
}

function RecipientDetail({ recipient }: { recipient: Recipient }) {
  const methodLabel =
    PAYMENT_METHOD_LABELS[recipient.defaultPaymentMethod] ??
    recipient.defaultPaymentMethod;

  const routing =
    recipient.defaultPaymentMethod === "ach"
      ? recipient.electronicRoutingInfo
      : recipient.defaultPaymentMethod === "domesticWire"
        ? recipient.domesticWireRoutingInfo
        : null;

  const intlRouting =
    recipient.defaultPaymentMethod === "internationalWire"
      ? recipient.internationalWireRoutingInfo
      : null;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={recipient.name} />
          {recipient.nickname && (
            <List.Item.Detail.Metadata.Label
              title="Nickname"
              text={recipient.nickname}
            />
          )}
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={recipient.status}
              color={recipient.status === "active" ? Color.Green : Color.Red}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Payment Method"
            text={methodLabel}
          />
          {routing && (
            <>
              {routing.bankName && (
                <List.Item.Detail.Metadata.Label
                  title="Bank Name"
                  text={routing.bankName}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Routing"
                text={routing.routingNumber}
              />
              <List.Item.Detail.Metadata.Label
                title="Account"
                text={maskAccountNumber(routing.accountNumber)}
              />
              {"electronicAccountType" in routing &&
                routing.electronicAccountType && (
                  <List.Item.Detail.Metadata.Label
                    title="Account Type"
                    text={routing.electronicAccountType}
                  />
                )}
            </>
          )}
          {intlRouting && (
            <>
              {intlRouting.iban && (
                <List.Item.Detail.Metadata.Label
                  title="IBAN"
                  text={intlRouting.iban}
                />
              )}
              {intlRouting.swiftCode && (
                <List.Item.Detail.Metadata.Label
                  title="SWIFT"
                  text={intlRouting.swiftCode}
                />
              )}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          {recipient.emails.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Email"
              text={recipient.emails[0]}
            />
          )}
          {recipient.dateLastPaid && (
            <List.Item.Detail.Metadata.Label
              title="Last Paid"
              text={formatDate(recipient.dateLastPaid)}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function RecipientListItem({
  recipient,
  showDetail = false,
  toggleDetail,
  onSendMoney,
}: RecipientListItemProps) {
  const methodLabel =
    PAYMENT_METHOD_LABELS[recipient.defaultPaymentMethod] ??
    recipient.defaultPaymentMethod;

  const accessories: List.Item.Accessory[] = showDetail
    ? [
        {
          tag: {
            value: recipient.status,
            color: recipient.status === "active" ? Color.Green : Color.Red,
          },
        },
      ]
    : [
        { tag: methodLabel },
        ...(recipient.dateLastPaid
          ? [{ text: `Last paid: ${formatDate(recipient.dateLastPaid)}` }]
          : []),
        {
          tag: {
            value: recipient.status,
            color: recipient.status === "active" ? Color.Green : Color.Red,
          },
        },
      ];

  return (
    <List.Item
      title={recipient.nickname ?? recipient.name}
      subtitle={recipient.nickname ? recipient.name : undefined}
      icon={{
        source: Icon.Person,
        tintColor:
          recipient.status === "active" ? Color.Blue : Color.SecondaryText,
      }}
      accessories={accessories}
      detail={
        showDetail ? <RecipientDetail recipient={recipient} /> : undefined
      }
      keywords={[recipient.name, recipient.nickname ?? "", ...recipient.emails]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {onSendMoney && recipient.status === "active" && (
              <Action
                title="Send Money"
                icon={Icon.ArrowRight}
                onAction={() => onSendMoney(recipient)}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Name"
              content={recipient.name}
            />
            {recipient.emails.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Email"
                content={recipient.emails[0]}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
            {toggleDetail && (
              <Action
                title={showDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={toggleDetail}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Recipient Id"
              content={recipient.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <AccountSwitcherActions />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}