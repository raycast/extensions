/**
 * Form component for creating auto-allocation rules.
 */

import { Action, ActionPanel, Form, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { MonetaryAccount, createAutoAllocation } from "../../api/endpoints";
import { useBunqSession, withSessionRefresh } from "../../hooks/useBunqSession";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

export interface CreateRuleFormProps {
  sourceAccount: MonetaryAccount;
  targetAccounts: MonetaryAccount[];
  session: ReturnType<typeof useBunqSession>;
  onCreated: () => void;
}

export function CreateRuleForm({ sourceAccount, targetAccounts, session, onCreated }: CreateRuleFormProps) {
  const { pop } = useNavigation();
  const [ruleType, setRuleType] = useState<"PERCENTAGE" | "AMOUNT">("PERCENTAGE");
  const [percentage, setPercentage] = useState("10");
  const [amount, setAmount] = useState("50");
  const [targetAccountId, setTargetAccountId] = useState(targetAccounts[0]?.id.toString() || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!targetAccountId) {
      await showToast({ style: Toast.Style.Failure, title: "Select a target account" });
      return;
    }

    if (ruleType === "PERCENTAGE") {
      const pct = parseFloat(percentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        await showToast({ style: Toast.Style.Failure, title: "Percentage must be between 1 and 100" });
        return;
      }
    } else {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        await showToast({ style: Toast.Style.Failure, title: "Amount must be greater than 0" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Creating rule..." });

      const rule = {
        type: ruleType,
        target_account_id: parseInt(targetAccountId, 10),
        ...(ruleType === "PERCENTAGE"
          ? { percentage: parseFloat(percentage) }
          : { amount: { value: amount, currency: sourceAccount.balance.currency } }),
      };

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        createAutoAllocation(userId, sourceAccount.id, rule, session.getRequestOptions()),
      );

      await showToast({ style: Toast.Style.Success, title: "Rule created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create rule",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Add Rule - ${sourceAccount.description}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Rule" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Auto-allocate incoming payments from "${sourceAccount.description}"`} />
      <Form.Dropdown
        id="ruleType"
        title="Allocation Type"
        value={ruleType}
        onChange={(v) => setRuleType(v as "PERCENTAGE" | "AMOUNT")}
      >
        <Form.Dropdown.Item value="PERCENTAGE" title="Percentage of payment" icon={Icon.Raindrop} />
        <Form.Dropdown.Item value="AMOUNT" title="Fixed amount" icon={Icon.Coins} />
      </Form.Dropdown>
      {ruleType === "PERCENTAGE" ? (
        <Form.TextField
          id="percentage"
          title="Percentage"
          placeholder="10"
          value={percentage}
          onChange={setPercentage}
          info="Percentage of each incoming payment to allocate (1-100)"
        />
      ) : (
        <Form.TextField
          id="amount"
          title={`Amount (${sourceAccount.balance.currency})`}
          placeholder="50"
          value={amount}
          onChange={setAmount}
          info="Fixed amount to allocate from each incoming payment"
        />
      )}
      <Form.Dropdown id="targetAccount" title="Target Account" value={targetAccountId} onChange={setTargetAccountId}>
        {targetAccounts.map((account) => (
          <Form.Dropdown.Item key={account.id} value={account.id.toString()} title={account.description} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Incoming payments will automatically be split according to this rule" />
    </Form>
  );
}
