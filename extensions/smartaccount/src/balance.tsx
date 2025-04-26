import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

async function getAccounts(): Promise<Account[]> {
  const { api_key, api_key_id, url } = getPreferenceValues<Preferences>();
  const e = await fetch(`${url}/api/bank_accounts`, {
    headers: {
      "key-id": api_key_id,
      authorization: api_key,
    },
  });
  return await (e.json() as Promise<Account[]>);
}

async function getBalances(): Promise<Balance[]> {
  const { api_key, api_key_id, url } = getPreferenceValues<Preferences>();
  const e = await fetch(`${url}/api/balances`, {
    headers: {
      "key-id": api_key_id,
      authorization: api_key,
    },
  });
  return await (e.json() as Promise<Balance[]>);
}

type Balance = {
  id: string;
  amount: {
    formatted: string;
  };
  date: string;
  bank_account_id: string;
  bankAccountName: string;
};

type Account = {
  id: string;
  name: string;
  iban: string;
};

export default function Command() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    getAccounts().then((accounts) => setAccounts(accounts));
  }, []);

  useEffect(() => {
    if (accounts.length) {
      getBalances()
        .then((balances) => {
          return balances.map((b) => {
            const account = accounts.find(({ id }) => id === b.bank_account_id);
            if (account) {
              return { ...b, bankAccountName: account.name };
            }

            return b;
          });
        })
        .then((balances) => setBalances(balances));
    }
  }, [accounts]);

  return (
    <List>
      {balances.map((b) => (
        <List.Item
          key={b.id}
          icon={Icon.CreditCard}
          title={b.amount.formatted}
          subtitle={b.bankAccountName}
          accessories={[{ text: `${b.date}` }]}
        />
      ))}
    </List>
  );
}
