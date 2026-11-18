import { withAccessToken } from "@raycast/utils";
import { useMemo } from "react";
import { hasSchwabCredentials, schwabOAuth } from "../lib/oauth";
import { useAccounts } from "../hooks/useAccounts";
import { useQuotes } from "../hooks/useQuotes";
import { AccountList } from "../components/AccountList";
import { Onboarding } from "../components/Onboarding";

function Portfolio() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const liveAccounts = accounts ?? [];

  const allSymbols = useMemo(() => {
    const symbols = new Set<string>();
    for (const account of liveAccounts) {
      for (const position of account.securitiesAccount.positions ?? []) {
        symbols.add(position.instrument.symbol);
      }
    }
    return Array.from(symbols);
  }, [liveAccounts]);

  const { data: quotes, isLoading: quotesLoading } = useQuotes(allSymbols);

  return <AccountList accounts={liveAccounts} quotes={quotes ?? {}} isLoading={accountsLoading || quotesLoading} />;
}

const Authed = withAccessToken(schwabOAuth)(Portfolio);

export default function Command() {
  return hasSchwabCredentials() ? <Authed /> : <Onboarding />;
}
