import { useState, FC } from "react";
import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  Icon,
  Color,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { randomUUID } from "crypto";

import { getAccountsAndPots, AccountPots, transferMoney } from "./lib/actions";
import { formatCurrency, accountTitle } from "./lib/formatting";

export default function Command() {
  const [amount, setAmount] = useState<number>(0);
  const [source, setSource] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [attemptToken, setAttemptToken] = useState<string>("");

  const { isLoading, data: accountPots } = usePromise(
    getAccountsAndPots,
    [],
    {}
  );

  const { data: transferred } = usePromise(
    transferMoney,
    [source, destination, amount, attemptToken],
    { execute: !!attemptToken }
  );
  if (transferred) {
    popToRoot();
    showHUD(`Transferred ${formatCurrency(amount, "GBP")}`);
  }

  const targets = accountPots ? formatTargets(accountPots) : [];

  function handleSubmit() {
    setAttemptToken(randomUUID());
  }

  function handleAmountChange(value: string) {
    setAmount(parseInt(value.replace(/\D/g, ""), 10));
  }

  function handleSourceChange(value: string) {
    setSource(value);
    const _source = targets.filter((t) => t.id == value)[0];
    const _destination = targets.filter((t) => t.id == destination)[0];
    if (
      _source &&
      _destination &&
      ((_source.isAccount && _destination.isAccount) ||
        (_source.isPot && _destination.isPot))
    ) {
      setDestination("");
    }
  }

  function handleDestinationChange(value: string) {
    setDestination(value);
    const _source = targets.filter((t) => t.id == source)[0];
    const _destination = targets.filter((t) => t.id == value)[0];
    if (
      _source &&
      _destination &&
      ((_source.isAccount && _destination.isAccount) ||
        (_source.isPot && _destination.isPot))
    ) {
      setSource("");
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Amount"
        value={amount ? formatCurrency(amount, "GBP") : ""}
        onChange={handleAmountChange}
      />
      <Form.Dropdown
        id="source"
        title="Transfer from"
        value={source}
        onChange={handleSourceChange}
      >
        <Form.Dropdown.Item value="" title="-" />
        {targets.map((target) => (
          <TargetItem key={target.id} target={target} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="destintation"
        title="Transfer to"
        value={destination}
        onChange={handleDestinationChange}
      >
        <Form.Dropdown.Item value="" title="-" />
        {targets.map((target) => (
          <TargetItem key={target.id} target={target} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Transfers can only be done to and from Pots, however you can transfer from an account, to a pot, and back to a different account." />
      <Form.Description text="Some transfers may take several business days to go through – for more details check the Monzo app." />
    </Form>
  );
}

const TargetItem: FC<{ target: Target }> = ({ target }) => {
  const icon = target.isPot
    ? { source: Icon.Coins, tintColor: Color.Yellow }
    : target.isJoint
    ? { source: Icon.TwoPeople, tintColor: Color.Green }
    : { source: Icon.Person, tintColor: Color.Green };
  return (
    <Form.Dropdown.Item value={target.id} title={target.name} icon={icon} />
  );
};

interface Target {
  name: string;
  balance: string;
  id: string;
  isPot: boolean;
  isAccount: boolean;
  isJoint: boolean;
}

function formatTargets(accountsAndPots: AccountPots[]): Target[] {
  const targets: Target[] = [];

  for (const { account, pots } of accountsAndPots) {
    targets.push({
      name: accountTitle(account),
      balance: "-",
      id: account.id,
      isPot: false,
      isAccount: true,
      isJoint: account.owners.length > 1,
    });

    for (const pot of pots) {
      targets.push({
        name: pot.name,
        balance: "-",
        id: pot.id,
        isPot: true,
        isAccount: false,
        isJoint: false,
      });
    }
  }
  return targets;
}
