import { Action, ActionPanel, Clipboard, Icon, showToast, Toast, List } from "@raycast/api";
import { useState } from "react";

import { Items } from "./Items";
import { Guide } from "./Guide";
import { User } from "../types";
import { op, cacheKeyForAccountId, useOp, cache, ACCOUNTS_CACHE_NAME, CURRENT_ACCOUNT_CACHE_NAME } from "../utils";

export function AccountForm() {
  const [currentAccount, setCurrentAccount] = useState<string>(cache.get(CURRENT_ACCOUNT_CACHE_NAME) || "");
  const [signedInAccounts, setSignedInAccounts] = useState<string[]>(
    cache.has(ACCOUNTS_CACHE_NAME) ? JSON.parse(cache.get(ACCOUNTS_CACHE_NAME)!) : []
  );
  const { data, error, isLoading } = useOp<User[]>("", ["account", "list"]);

  const changeCurrentAccount = (newValue: string) => {
    cache.set(CURRENT_ACCOUNT_CACHE_NAME, newValue);
    setCurrentAccount(newValue);
  };

  const signin = async (accountId: string) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Signing in...",
    });

    try {
      op(["signin", "--account", accountId]);
      const userJson = op(["whoami", "--format=json", `--account=${accountId}`]);
      cache.set(cacheKeyForAccountId(accountId), userJson);
      const updatedAccountList = [...signedInAccounts, accountId];
      setSignedInAccounts(updatedAccountList);
      cache.set(ACCOUNTS_CACHE_NAME, JSON.stringify(updatedAccountList));

      toast.style = Toast.Style.Success;
      toast.title = "Signed in";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to sign in";
      if (error instanceof Error) {
        toast.message = error.message;
        toast.primaryAction = {
          title: "Copy logs",
          onAction: async (toast) => {
            await Clipboard.copy((error as Error).message);
            toast.hide();
          },
        };
      }
    }
  };

  if (error) return <Guide />;
  if (currentAccount && currentAccount !== "" && cache.has(cacheKeyForAccountId(currentAccount))) {
    return (
      <Items
        accountId={currentAccount}
        account={JSON.parse(cache.get(cacheKeyForAccountId(currentAccount))!)}
        changeCurrentAccount={changeCurrentAccount}
      />
    );
  }
  return (
    <List navigationTitle="Account List" isLoading={isLoading}>
      {(data || []).map((account) => (
        <List.Item
          key={account.account_uuid}
          id={account.account_uuid}
          title={`${account.url} - ${account.email}`}
          icon={cache.has(cacheKeyForAccountId(account.account_uuid)) ? Icon.LockUnlocked : Icon.Lock}
          actions={
            <ActionPanel>
              {cache.has(cacheKeyForAccountId(account.account_uuid)) ? (
                <Action
                  title="List Items"
                  onAction={() => {
                    changeCurrentAccount(account.account_uuid);
                  }}
                />
              ) : (
                <Action title="Login" onAction={async () => signin(account.account_uuid)} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
