import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { api } from "../lib/api";
import { accountDetails, accountDetailsText } from "../lib/account-details";
import { accountName, accountUrl } from "../lib/format";
import type { FinancialAccount } from "../lib/types";
import { CommonActions } from "./common";
import { ErrorView } from "./session";

export function AccountDetails({ account }: { account: FinancialAccount }) {
  const abortable = useRef<AbortController | null>(null);
  const { data, error, isLoading, revalidate } = usePromise(
    (id: number) => api.accountDetails(id, abortable.current?.signal),
    [account.id],
    { abortable, onError: () => {} },
  );
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${accountName(account)} Details`}
      searchBarPlaceholder="Find an account field…"
    >
      {error ? (
        <ErrorView error={error} retry={revalidate} />
      ) : data ? (
        accountDetails(data).map(([label, value]) => (
          <List.Item
            key={label}
            title={label}
            keywords={[value]}
            accessories={[{ text: value, tooltip: value }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title={`Copy ${label}`}
                  content={value}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard title="Copy Account Details" content={accountDetailsText(data)} />
                <Action.OpenInBrowser title="Open Account in Synci" url={accountUrl(data)} icon={Icon.Globe} />
                <CommonActions refresh={revalidate} />
              </ActionPanel>
            }
          />
        ))
      ) : null}
    </List>
  );
}
