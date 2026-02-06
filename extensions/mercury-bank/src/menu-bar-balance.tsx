import { Icon, MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getActiveAccount } from "./lib/accounts";
import { MercuryApi } from "./lib/api";
import { formatCurrency } from "./lib/utils";

export default function MenuBarBalance() {
  const { data, isLoading } = usePromise(async () => {
    const account = await getActiveAccount();
    if (!account) return null;
    const api = new MercuryApi(account.apiKey);
    const accounts = await api.getAccounts();
    const active = accounts.filter((a) => a.status === "active");
    const total = active.reduce((sum, a) => sum + a.availableBalance, 0);
    return { total, accounts: active, accountName: account.name };
  });

  if (!data) {
    return (
      <MenuBarExtra
        icon={Icon.BankNote}
        isLoading={isLoading}
        title={isLoading ? "..." : "No Account"}
      >
        <MenuBarExtra.Item title="Set up Mercury account first" />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={Icon.BankNote}
      isLoading={isLoading}
      title={formatCurrency(data.total)}
    >
      <MenuBarExtra.Section title={`Mercury - ${data.accountName}`}>
        {data.accounts.map((account) => (
          <MenuBarExtra.Item
            key={account.id}
            title={`${account.nickname ?? account.name}`}
            subtitle={formatCurrency(account.availableBalance)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Total: ${formatCurrency(data.total)}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Mercury Dashboard"
          onAction={() => open("https://app.mercury.com")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}