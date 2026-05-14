/**
 * PIN assignment view component for managing card PIN settings.
 */

import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { getMonetaryAccounts, updateCard, type Card } from "../../api/endpoints";
import { getCardName } from "./card-helpers";
import { getErrorMessage } from "../../lib/errors";

interface PinAssignmentViewProps {
  card: Card;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
}

export function PinAssignmentView({ card, session, onUpdate }: PinAssignmentViewProps) {
  const { pop } = useNavigation();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    card.pin_code_assignment?.find((p) => p.type === "PRIMARY")?.monetary_account_id?.toString() || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: accounts, isLoading: isLoadingAccounts } = usePromise(
    async () => {
      if (!session.userId || !session.sessionToken) return [];
      return withSessionRefresh(session, () => getMonetaryAccounts(session.userId!, session.getRequestOptions()));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  const activeAccounts = accounts?.filter((a) => a.status === "ACTIVE") || [];

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      await showToast({ style: Toast.Style.Failure, title: "Select an account" });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating PIN assignment..." });

      await withSessionRefresh(session, () =>
        updateCard(
          session.userId!,
          card.id,
          {
            pin_code_assignment: [{ type: "PRIMARY", monetary_account_id: parseInt(selectedAccountId, 10) }],
          },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "PIN assignment updated" });
      onUpdate();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update PIN",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAccount = activeAccounts.find(
    (a) =>
      a.id.toString() ===
      (card.pin_code_assignment?.find((p) => p.type === "PRIMARY")?.monetary_account_id?.toString() || ""),
  );

  return (
    <Form
      isLoading={isSubmitting || isLoadingAccounts}
      navigationTitle={`PIN Assignment - ${getCardName(card)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update PIN Assignment" icon="checkmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Assign PIN transactions for ${getCardName(card)} to an account`} />
      {currentAccount && <Form.Description text={`Currently linked to: ${currentAccount.description}`} />}
      <Form.Dropdown id="account" title="Linked Account" value={selectedAccountId} onChange={setSelectedAccountId}>
        {activeAccounts.map((account) => (
          <Form.Dropdown.Item key={account.id} value={account.id.toString()} title={account.description} />
        ))}
      </Form.Dropdown>
      <Form.Description text="PIN transactions will be debited from this account" />
    </Form>
  );
}
