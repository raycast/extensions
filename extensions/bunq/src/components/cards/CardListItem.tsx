/**
 * Card list item component with actions for managing cards.
 */

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { updateCard, type Card } from "../../api/endpoints";
import { getCardStatusAppearance } from "../../lib/status-helpers";
import { getErrorMessage } from "../../lib/errors";
import { copyToClipboard } from "../../lib/actions";
import { getCardStatus, getCardName, getExpiryColor, formatExpiryDate } from "./card-helpers";
import { CardDetailMetadata } from "./CardDetailMetadata";
import { Cvc2DetailView } from "./Cvc2DetailView";
import { CardTransactionsList } from "./CardTransactionsList";
import { CardLimitsForm } from "./CardLimitsForm";
import { CardCountryForm } from "./CardCountryForm";
import { PinAssignmentView } from "./PinAssignmentView";

interface CardListItemProps {
  card: Card;
  userId: string;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
  isSelected: boolean;
}

export function CardListItem({ card, userId, session, onUpdate, isSelected }: CardListItemProps) {
  const { push } = useNavigation();
  const cardStatus = getCardStatus(card);
  const statusUpper = cardStatus.toUpperCase();
  const canToggle = statusUpper === "ACTIVE" || statusUpper === "DEACTIVATED" || statusUpper === "NONE";
  const isActive = statusUpper === "ACTIVE" || statusUpper === "NONE";
  const isVirtualCard = card.sub_type === "VIRTUAL";
  const statusAppearance = getCardStatusAppearance(cardStatus);

  const handleToggleStatus = async () => {
    const newStatus = isActive ? "DEACTIVATED" : "ACTIVE";
    const action = isActive ? "freeze" : "unfreeze";

    const confirmed = await confirmAlert({
      title: `${isActive ? "Freeze" : "Unfreeze"} Card`,
      message: `Are you sure you want to ${action} ${getCardName(card)}?`,
      primaryAction: {
        title: isActive ? "Freeze" : "Unfreeze",
        style: isActive ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: `${isActive ? "Freezing" : "Unfreezing"} card...` });

      await withSessionRefresh(session, () =>
        updateCard(userId, card.id, { status: newStatus }, session.getRequestOptions()),
      );

      await showToast({ style: Toast.Style.Success, title: `Card ${isActive ? "frozen" : "unfrozen"}` });
      onUpdate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${action} card`,
        message: getErrorMessage(error),
      });
    }
  };

  const lastFour = card.primary_account_number_four_digit;

  const accessories: {
    text?: { value: string; color: Color };
    tag?: { value: string; color: Color };
    tooltip?: string;
  }[] = [];

  if (isActive && card.expiry_date) {
    accessories.push({
      text: { value: formatExpiryDate(card.expiry_date), color: getExpiryColor(card.expiry_date) },
      tooltip: `Expires ${card.expiry_date}`,
    });
  } else if (!isActive) {
    accessories.push({ tag: { value: statusAppearance.label, color: statusAppearance.color }, tooltip: "Card status" });
  }

  const handleCopyLastFour = async () => {
    if (lastFour) {
      await copyToClipboard(lastFour, "last 4 digits");
    }
  };

  const handleCopyIban = async () => {
    if (card.label_monetary_account_current?.iban) {
      await copyToClipboard(card.label_monetary_account_current.iban, "IBAN");
    }
  };

  return (
    <List.Item
      id={card.id.toString()}
      title={getCardName(card)}
      icon={{ source: Icon.CreditCard, tintColor: statusAppearance.color }}
      accessories={accessories}
      detail={isSelected ? <CardDetailMetadata card={card} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isVirtualCard && isActive && (
              <Action
                title="View CVC2"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
                onAction={() => push(<Cvc2DetailView card={card} session={session} />)}
              />
            )}
            {card.type === "MASTERCARD" && (
              <Action
                title="View Transactions"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => push(<CardTransactionsList card={card} session={session} />)}
              />
            )}
            {canToggle && (
              <Action
                title={isActive ? "Freeze Card" : "Unfreeze Card"}
                icon={isActive ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={handleToggleStatus}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Settings">
            <Action
              title="Edit Limits"
              icon={Icon.Gauge}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={() => push(<CardLimitsForm card={card} session={session} onUpdate={onUpdate} />)}
            />
            <Action
              title="Manage Countries"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => push(<CardCountryForm card={card} session={session} onUpdate={onUpdate} />)}
            />
            {card.pin_code_assignment && card.pin_code_assignment.length > 0 && (
              <Action
                title="Manage PIN Assignment"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => push(<PinAssignmentView card={card} session={session} onUpdate={onUpdate} />)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {card.label_monetary_account_current?.iban && (
              <Action title="Copy Linked IBAN" icon={Icon.Clipboard} onAction={handleCopyIban} />
            )}
            {lastFour && <Action title="Copy Last 4 Digits" icon={Icon.Clipboard} onAction={handleCopyLastFour} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
