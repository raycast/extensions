import { UseRecurly } from "./useRecurly";
import { useEffect, useState } from "react";
import { Account, Client } from "recurly";
import showError from "../showError";

export type UseRecurlyAccounts = {
  accounts: Account[];
  accountsLoading: boolean;
};

export default function useRecurlyAccounts({ recurly, recurlyValid }: UseRecurly, text: string) {
  const [state, setState] = useState<UseRecurlyAccounts>({ accountsLoading: false, accounts: [] });

  useEffect(() => {
    if (text.length === 0) return;
    if (!recurlyValid) return;

    text.length > 0 &&
      Promise.resolve()
        .then(() => setState((prev) => ({ ...prev, accountsLoading: true })))
        .then(() => iterateAccounts(recurly, text))
        .then((accounts) => setState({ accounts, accountsLoading: false }))
        .catch(showError);
  }, [recurly, recurlyValid, text]);

  return state;
}

const iterateAccounts = async (recurly: Client, email: string) => {
  if (email.length === 0) return [];

  const accounts: Account[] = [];

  const max = 40;
  let index = 0;

  for await (const account of recurly.listAccounts({ params: { email } }).each()) {
    index++;
    if (index > max) {
      break;
    }

    accounts.push(account);
  }

  return accounts;
};
