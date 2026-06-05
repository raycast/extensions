import { List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Account, bootstrapAccounts, getAccounts } from "./accounts";
import { AuthForm } from "./auth-form";
import { ProjectList } from "./project-list";

export default function Command() {
  // undefined = loading, [] = no accounts (sign-in), non-empty = ready.
  const [accounts, setAccounts] = useState<Account[] | undefined>(undefined);

  const refresh = useCallback(async () => {
    setAccounts(await getAccounts());
  }, []);

  useEffect(() => {
    bootstrapAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  if (accounts === undefined) return <List isLoading searchBarPlaceholder="Loading…" />;
  if (accounts.length === 0) return <AuthForm onDone={refresh} />;
  return <ProjectList accounts={accounts} onAccountsChanged={refresh} />;
}
