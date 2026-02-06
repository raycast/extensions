import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AccountGuard } from "./components/AccountGuard";
import { MercuryApi } from "./lib/api";
import { formatCurrency, formatDate } from "./lib/utils";

export default function AiAccountSummary() {
  return (
    <AccountGuard>
      {(apiKey, accountName) => (
        <SummaryView apiKey={apiKey} accountName={accountName} />
      )}
    </AccountGuard>
  );
}

function SummaryView({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data, isLoading } = usePromise(
    async (key: string) => {
      const api = new MercuryApi(key);
      const [accounts, transactions] = await Promise.all([
        api.getAccounts(),
        api.getAllTransactions({ limit: 100 }),
      ]);

      const active = accounts.filter((a) => a.status === "active");
      const totalBalance = active.reduce(
        (sum, a) => sum + a.availableBalance,
        0,
      );
      const income = transactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions
        .filter((t) => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const topExpenses = new Map<string, number>();
      transactions
        .filter((t) => t.amount < 0)
        .forEach((t) => {
          const name = t.counterpartyName || "Unknown";
          topExpenses.set(
            name,
            (topExpenses.get(name) ?? 0) + Math.abs(t.amount),
          );
        });

      const sortedExpenses = Array.from(topExpenses.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const recentTransactions = transactions.slice(0, 5);

      return {
        active,
        totalBalance,
        income,
        expenses,
        sortedExpenses,
        recentTransactions,
      };
    },
    [apiKey],
  );

  const markdown = data
    ? `# Financial Summary — ${accountName}

## Account Balances
| Account | Balance |
|---------|---------|
${data.active.map((a) => `| ${a.nickname ?? a.name} | ${formatCurrency(a.availableBalance)} |`).join("\n")}
| **Total** | **${formatCurrency(data.totalBalance)}** |

## Cash Flow (Recent)
- **Income:** ${formatCurrency(data.income)}
- **Expenses:** ${formatCurrency(data.expenses)}
- **Net:** ${formatCurrency(data.income - data.expenses)}

## Top Expenses
| Counterparty | Amount |
|-------------|--------|
${data.sortedExpenses.map(([name, amount]) => `| ${name} | ${formatCurrency(amount)} |`).join("\n")}

## Recent Transactions
| Date | Counterparty | Amount |
|------|-------------|--------|
${data.recentTransactions.map((t) => `| ${formatDate(t.createdAt)} | ${t.counterpartyName} | ${formatCurrency(t.amount)} |`).join("\n")}

---
*Use Raycast AI to ask follow-up questions about your finances.*`
    : "Loading your financial summary...";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      markdown={markdown}
    />
  );
}