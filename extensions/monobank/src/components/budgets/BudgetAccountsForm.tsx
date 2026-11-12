import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { accountTypeTitles } from "../../data/constants";
import { useBudgetAccounts } from "../../hooks";
import { Account } from "../../types";
import { getStatementItemTitle } from "../../utils";

/** Chooses the accounts budgets count: any UAH card or FOP account. */
export default function BudgetAccountsForm() {
  const { accounts, eligible, isCustom, isLoading, save, reset } = useBudgetAccounts();
  const navigation = useNavigation();
  const [checked, setChecked] = useState<Set<string>>();
  const [error, setError] = useState<string>();

  // Starts from the current selection once it's known. Waits for the accounts too: before the first fetch, there are
  // none to check.
  useEffect(() => {
    if (accounts && !isLoading && !checked) setChecked(new Set(accounts.map((account) => account.id)));
  }, [accounts, isLoading]);

  function toggle(id: string, value: boolean) {
    const next = new Set(checked);
    if (value) next.add(id);
    else next.delete(id);
    setChecked(next);
    setError(next.size ? undefined : "Check at least one card");
  }

  async function handleSave() {
    // In the order of the account dropdown, and without ids of accounts that are gone.
    const ids = eligible.filter((account) => checked?.has(account.id)).map((account) => account.id);
    if (!ids.length) {
      setError("Check at least one card");
      return;
    }

    await save(ids);
    navigation.pop();
    await showToast(
      Toast.Style.Success,
      "Budget Accounts Saved",
      `${ids.length} ${ids.length === 1 ? "card" : "cards"}`,
    );
  }

  async function handleReset() {
    await reset();
    navigation.pop();
    await showToast(Toast.Style.Success, "Budget Accounts Reset", "Your personal UAH cards are counted");
  }

  return (
    <Form
      navigationTitle="Choose Budget Accounts"
      isLoading={isLoading || !checked}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSave} />
          {isCustom && <Action title="Reset to Default" icon={Icon.ArrowCounterClockwise} onAction={handleReset} />}
        </ActionPanel>
      }
    >
      <Form.Description text="Budgets count spending on the checked cards together, so a limit covers all of them." />
      {checked &&
        eligible.map((account, index) => (
          <Form.Checkbox
            key={account.id}
            id={account.id}
            title={index === 0 ? "Cards" : undefined}
            label={getLabel(account)}
            value={checked.has(account.id)}
            onChange={(value) => toggle(account.id, value)}
            error={index === 0 ? error : undefined}
          />
        ))}
      {checked && !eligible.length && !isLoading && <Form.Description text="You have no UAH cards." />}
      <Form.Description text="By default, your personal UAH cards are counted, not FOP or eAid accounts. USD and EUR cards and jars aren't counted." />
    </Form>
  );
}

/** E.g. "Black *0001", or "Main · White" for a card with a custom name. */
function getLabel(account: Account) {
  const title = getStatementItemTitle(account);
  const type = accountTypeTitles[account.type] ?? account.type;
  return title.startsWith(type) ? title : `${title} · ${type}`;
}
