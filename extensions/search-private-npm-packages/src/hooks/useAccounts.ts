import { Common } from "@data/common";
import { TAccount } from "@data/types";
import { useLocalStorage } from "@hooks/useLocalStorage";
import { Toast, showToast } from "@raycast/api";

export function useAccounts() {
  const { value, setValue, removeValue, isLoading } = useLocalStorage<TAccount[]>(Common.StorageKeys.Account, []);

  async function addAccount(account: TAccount) {
    account.name = account.name.replace(/^@/, "");
    if (value.some((acc) => acc.name === account.name)) {
      showToast({ style: Toast.Style.Failure, title: "Account already exists" });
      throw new Error("Account already exists");
    }
    await setValue([...value, account]);
  }

  async function removeAccount(accountName: string) {
    await setValue(value.filter((acc) => acc.name !== accountName));
  }

  async function updateAccount(account: TAccount) {
    await setValue(value.map((acc) => (acc.name === account.name ? account : acc)));
  }

  async function clearAccounts() {
    await removeValue();
  }

  return { accounts: value, addAccount, removeAccount, updateAccount, clearAccounts, isLoading };
}
