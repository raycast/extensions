import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getTransactionPage, getAllAccounts } from "../lib/api";
import { getAccessToken } from "../lib/auth";
import { CACHE_KEYS, getCached } from "../lib/cache";
import { Account, CredentialWithAccounts, Transaction } from "../lib/types";
import { formatCurrency } from "../lib/format";
import { LogoutAction } from "./logout-action";

// Category icon_key → Raycast Icon mapping (parent categories only)
const CATEGORY_ICONS: Record<string, Icon> = {
  auto: Icon.Car,
  personal_care: Icon.Person,
  shopping: Icon.Cart,
  children: Icon.TwoPeople,
  debt_repayment: Icon.BankNote,
  communications: Icon.Phone,
  eating_out: Icon.Mug,
  education: Icon.Book,
  fees: Icon.Coins,
  groceries: Icon.Cart,
  health_medical: Icon.Heartbeat,
  home: Icon.House,
  holiday_leisure: Icon.Airplane,
  media: Icon.Monitor,
  entertainment: Icon.GameController,
  taxes: Icon.Receipt,
  transport: Icon.Train,
  utilities: Icon.LightBulb,
  gifts_donations: Icon.Gift,
  business_expense: Icon.Building,
  salary: Icon.BankNote,
  other_income: Icon.Plus,
  transfer: Icon.Switch,
  uncategorized: Icon.QuestionMark,
  financial_services: Icon.BarChart,
  investments: Icon.LineChart,
};

// category_id → parent icon_key (from Moneytree categories API)
const CATEGORY_ID_TO_ICON_KEY: Record<number, string> = {
  1: "auto",
  2: "auto",
  3: "auto",
  4: "auto",
  5: "auto",
  6: "auto",
  7: "auto",
  8: "personal_care",
  9: "personal_care",
  10: "personal_care",
  11: "shopping",
  12: "shopping",
  13: "shopping",
  14: "shopping",
  15: "shopping",
  16: "shopping",
  17: "children",
  18: "children",
  19: "children",
  20: "debt_repayment",
  21: "debt_repayment",
  22: "communications",
  23: "communications",
  24: "communications",
  25: "communications",
  26: "communications",
  27: "eating_out",
  28: "eating_out",
  29: "eating_out",
  30: "eating_out",
  31: "education",
  32: "education",
  33: "education",
  34: "education",
  35: "fees",
  36: "fees",
  37: "fees",
  38: "fees",
  39: "fees",
  40: "groceries",
  41: "health_medical",
  42: "health_medical",
  43: "health_medical",
  44: "health_medical",
  45: "health_medical",
  46: "health_medical",
  47: "home",
  48: "home",
  49: "home",
  50: "home",
  51: "home",
  52: "holiday_leisure",
  53: "holiday_leisure",
  54: "holiday_leisure",
  55: "holiday_leisure",
  56: "holiday_leisure",
  57: "media",
  58: "media",
  59: "media",
  60: "media",
  61: "media",
  62: "media",
  63: "entertainment",
  64: "entertainment",
  65: "entertainment",
  66: "entertainment",
  67: "taxes",
  68: "taxes",
  69: "transport",
  70: "transport",
  71: "transport",
  72: "transport",
  73: "transport",
  74: "utilities",
  75: "utilities",
  76: "utilities",
  77: "utilities",
  78: "gifts_donations",
  79: "gifts_donations",
  80: "gifts_donations",
  81: "gifts_donations",
  82: "business_expense",
  83: "business_expense",
  84: "business_expense",
  85: "business_expense",
  86: "business_expense",
  87: "business_expense",
  88: "salary",
  89: "salary",
  90: "other_income",
  91: "other_income",
  92: "other_income",
  93: "other_income",
  94: "transfer",
  95: "uncategorized",
  96: "uncategorized",
  97: "financial_services",
  98: "financial_services",
  99: "financial_services",
  128: "uncategorized",
  184183: "investments",
  184184: "investments",
  184185: "investments",
  184186: "investments",
  343563: "transport",
  796892: "children",
  863599: "education",
  959830: "entertainment",
  959842: "other_income",
  1089836: "entertainment",
  1139209: "personal_care",
  1139300: "personal_care",
  1218703: "transport",
  1228961: "health_medical",
  1242990: "children",
  1247450: "holiday_leisure",
  1248324: "education",
  1253247: "holiday_leisure",
  1263567: "business_expense",
  1273757: "entertainment",
};

function getCategoryIcon(categoryId: number): Icon {
  const iconKey = CATEGORY_ID_TO_ICON_KEY[categoryId];
  return (iconKey && CATEGORY_ICONS[iconKey]) || Icon.QuestionMark;
}

function parseDateParts(dateString: string): { year: string; month: string; day: string } {
  const [year, month, day] = dateString.substring(0, 10).split("-");
  return { year, month, day };
}

function getDayOfMonth(dateString: string): string {
  return String(Number(parseDateParts(dateString).day));
}

function formatDate(dateString: string): string {
  const { year, month, day } = parseDateParts(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function getMonthKey(dateString: string): string {
  const { year, month } = parseDateParts(dateString);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[Number(month) - 1]} ${year}`;
}

function groupByMonth(transactions: Transaction[]): [string, Transaction[]][] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = getMonthKey(tx.date);
    const group = groups.get(key);
    if (group) {
      group.push(tx);
    } else {
      groups.set(key, [tx]);
    }
  }
  return Array.from(groups.entries());
}

function getTransactionDetails(transaction: Transaction): string {
  const isExpense = transaction.amount < 0;
  const description = transaction.description_pretty || transaction.description_raw;
  return `${formatDate(transaction.date)} - ${description}: ${isExpense ? "-" : "+"}${formatCurrency(Math.abs(transaction.amount))}`;
}

function getDateRange(search: boolean): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  if (search) {
    startDate.setMonth(startDate.getMonth() - 6);
    startDate.setDate(1);
  } else {
    startDate.setDate(startDate.getDate() - 30);
  }
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

export function TransactionsList({ accountId, initialQuery }: { accountId?: string; initialQuery?: string }) {
  const [searchText, setSearchText] = useState(initialQuery || "");
  const [accountFilter, setAccountFilter] = useState(accountId || "");
  const [accounts, setAccounts] = useState<(Account & { credentialName: string })[]>([]);

  // Load accounts for the dropdown
  useEffect(() => {
    async function loadAccounts() {
      try {
        await getAccessToken();
        const cachedAccounts = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
        const creds = cachedAccounts && cachedAccounts.length > 0 ? cachedAccounts : await getAllAccounts();
        const flat = creds.flatMap((c) =>
          c.accounts
            .filter((a) => !["manual", "cash_wallet"].includes(a.account_type))
            .map((a) => ({ ...a, credentialName: c.institution_name || "Unknown" })),
        );
        setAccounts(flat);
      } catch {
        // Accounts will load when transactions fetch succeeds
      }
    }
    loadAccounts();
  }, []);

  const effectiveAccountId = accountFilter || accountId || "";

  const { isLoading, data, pagination } = useCachedPromise(
    (query: string, acctId: string) =>
      async ({ page }: { page: number }) => {
        await getAccessToken();

        const { startDate, endDate } = getDateRange(!!query || !!acctId);
        const response = await getTransactionPage({
          startDate,
          endDate,
          page: page + 1,
          search: query || undefined,
          accountId: acctId ? Number(acctId) : undefined,
        });

        const totalCount = response.transactions_details.transactions_count;
        const fetchedSoFar = page * 25 + response.transactions.length;

        return {
          data: response.transactions,
          hasMore: fetchedSoFar < totalCount && response.transactions.length > 0,
        };
      },
    [searchText, effectiveAccountId],
    { keepPreviousData: !accountId },
  );

  const transactions = data ?? [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.nickname || a.institution_account_name]));

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Query"
      navigationTitle="Transactions"
      throttle
      pagination={pagination}
      searchBarAccessory={
        accountId ? undefined : (
          <List.Dropdown
            tooltip="Filter by Account"
            storeValue={!accountId}
            value={accountFilter}
            onChange={setAccountFilter}
          >
            <List.Dropdown.Item title="All" value="" />
            {accounts.map((account) => (
              <List.Dropdown.Item
                key={account.id}
                title={`${account.nickname || account.institution_account_name} (${account.credentialName})`}
                value={String(account.id)}
              />
            ))}
          </List.Dropdown>
        )
      }
    >
      {transactions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={searchText ? Icon.MagnifyingGlass : Icon.Receipt}
          title={searchText ? "No Matching Transactions" : "No Transactions"}
          description={
            searchText ? `No transactions matching "${searchText}"` : "No transactions found for the last 30 days."
          }
          actions={
            <ActionPanel>
              <LogoutAction />
            </ActionPanel>
          }
        />
      ) : (
        groupByMonth(transactions).map(([month, txs]) => (
          <List.Section key={month} title={month}>
            {txs.map((transaction) => {
              const isExpense = transaction.amount < 0;
              return (
                <List.Item
                  key={transaction.id}
                  icon={getCategoryIcon(transaction.category_id)}
                  title={`${getDayOfMonth(transaction.date)}  ${transaction.description_pretty || transaction.description_raw || "Unknown"}`}
                  subtitle={accountMap.get(transaction.account_id)}
                  accessories={[
                    {
                      text: {
                        value: `${isExpense ? "-" : "+"}${formatCurrency(Math.abs(transaction.amount))}`,
                        color: isExpense ? Color.Red : Color.Green,
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Transaction Details"
                        icon={Icon.Clipboard}
                        content={getTransactionDetails(transaction)}
                      />
                      <LogoutAction />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
