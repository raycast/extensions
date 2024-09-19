import { useState, useEffect } from "react";
import {
  Detail,
  showToast,
  Toast,
  getPreferenceValues,
  AI,
  environment,
  Icon,
  Action,
  ActionPanel,
  Image,
  Color,
  confirmAlert,
  Alert,
  showHUD,
} from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  apiKey: string;
}

interface Account {
  accountNumber: string;
  availableBalance: number;
  createdAt: string;
  currentBalance: number;
  id: string;
  kind: string;
  name: string;
  routingNumber: string;
  status: "active" | "deleted" | "pending" | "archived";
  type: "mercury" | "external" | "recipient";
  canReceiveTransactions: boolean | null;
  nickname: string | null;
  legalBusinessName: string;
}

interface Transaction {
  amount: number;
  bankDescription: string | null;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyNickname: string | null;
  createdAt: string;
  dashboardLink: string;
  details: {
    address: {
      address1: string;
      address2: string | null;
      city: string;
      state: string | null;
      postalCode: string;
    } | null;
    domesticWireRoutingInfo: unknown | null;
    electronicRoutingInfo: unknown | null;
    internationalWireRoutingInfo: unknown | null;
    debitCardInfo: {
      id: string;
    } | null;
    creditCardInfo: {
      id: string;
    } | null;
  } | null;
  estimatedDeliveryDate: string;
  failedAt: string | null;
  id: string;
  kind:
    | "externalTransfer"
    | "internalTransfer"
    | "outgoingPayment"
    | "creditCardCredit"
    | "creditCardTransaction"
    | "debitCardTransaction"
    | "incomingDomesticWire"
    | "checkDeposit"
    | "incomingInternationalWire"
    | "treasuryTransfer"
    | "wireFee"
    | "other";
  note: string | null;
  externalMemo: string | null;
  postedAt: string | null;
  reasonForFailure: string | null;
  status: "pending" | "sent" | "cancelled" | "failed";
  feeId: string | null;
  currencyExchangeInfo: {
    convertedFromCurrency: string;
    convertedToCurrency: string;
    convertedFromAmount: number;
    convertedToAmount: number;
    feeAmount: number;
    feePercentage: number;
    exchangeRate: number;
    feeTransactionId: string;
  } | null;
  compliantWithReceiptPolicy: boolean | null;
  hasGeneratedReceipt: boolean | null;
  creditAccountPeriodId: string | null;
  mercuryCategory: string | null;
  generalLedgerCodeName: string | null;
  attachments: Array<{
    fileName: string;
    url: string;
    attachmentType: "checkImage" | "receipt" | "other";
  }>;
}

const API_BASE_URL = "https://api.mercury.com/api/v1";

/**
 * Fetch all accounts from the Mercury API.
 */
async function fetchAccounts(apiKey: string): Promise<Account[]> {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }

  const data = (await response.json()) as { accounts: Account[] };
  return data.accounts;
}

/**
 * Fetch transactions for a specific account.
 */
async function fetchTransactions(apiKey: string, accountId: string): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE_URL}/account/${accountId}/transactions?limit=500`, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions for account ${accountId}: ${response.statusText}`);
  }

  const data = (await response.json()) as { transactions: Transaction[] };
  return data.transactions;
}

/**
 * Fetch transactions for all accounts.
 */
async function fetchAllTransactions(apiKey: string, accounts: Account[]): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  for (const account of accounts) {
    const transactions = await fetchTransactions(apiKey, account.id);
    allTransactions.push(...transactions);
  }
  return allTransactions;
}

/**
 * Prepare the prompt to send to Raycast AI.
 */
function prepareDataForAI(accounts: Account[], transactions: Transaction[]): string {
  let prompt = `You are an expert financial assistant. Based on the following account information and recent transactions, please provide a clear and concise summary. Your summary should include:

1. **Overall Financial Health**: Briefly describe the overall financial status.
2. **Key Insights and Trends**: Highlight any patterns, trends, or noteworthy events.
3. **Significant Transactions**: Mention any unusual or significant transactions.
4. **Recommendations**: Provide actionable suggestions for financial improvement, if applicable.

**Please output the summary in clean and easy-to-read Markdown format, using headings and bullet points to enhance readability.**

### Accounts:
`;

  accounts.forEach((account) => {
    prompt += `- **${account.nickname || account.name}** (${capitalize(account.kind)} Account)
  - Balance: ${formatCurrency(account.currentBalance)}
  - Status: ${capitalize(account.status)}\n`;
  });

  prompt += `\n### Recent Transactions (Last 30 Days):\n`;

  const recentTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return transactionDate >= thirtyDaysAgo;
  });

  recentTransactions.forEach((transaction) => {
    prompt += `- **${transaction.counterpartyName || "N/A"}**
  - Amount: ${formatCurrency(transaction.amount)} (${transaction.amount < 0 ? "Debit" : "Credit"})
  - Date: ${transaction.createdAt.slice(0, 10)}
  - Type: ${capitalize(transaction.kind.replace(/([A-Z])/g, " $1"))}
`;
    if (transaction.note) {
      prompt += `  - Note: ${transaction.note}\n`;
    }
    if (transaction.externalMemo) {
      prompt += `  - Memo: ${transaction.externalMemo}\n`;
    }
    if (transaction.bankDescription) {
      prompt += `  - Bank Description: ${transaction.bankDescription}\n`;
    }
    if (transaction.mercuryCategory) {
      prompt += `  - Category: ${transaction.mercuryCategory}\n`;
    }
    prompt += "\n";
  });

  prompt += `\n**Please provide the summary below:**`;

  return prompt;
}

/**
 * Format currency values.
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Capitalize a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Main component for the AI Account Summary command.
 */
export default function AIAccountSummaryCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const { apiKey } = getPreferenceValues<Preferences>();
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    async function generateSummary() {
      try {
        // Check if the user has access to Raycast AI
        if (!environment.canAccess(AI)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Raycast AI Not Available",
            message: "Upgrade to Raycast Pro to use this feature.",
          });
          setIsLoading(false);
          return;
        }

        // Show a loading toast
        const fetchingToast = await showToast({
          style: Toast.Style.Animated,
          title: "Fetching data...",
        });

        // Fetch accounts and transactions
        const fetchedAccounts = await fetchAccounts(apiKey);
        setAccounts(fetchedAccounts);
        const transactions = await fetchAllTransactions(apiKey, fetchedAccounts);

        // Prepare prompt
        const prompt = prepareDataForAI(fetchedAccounts, transactions);

        // Update the toast
        fetchingToast.title = "Generating summary...";
        fetchingToast.message = undefined;

        // Use AI.ask to get the summary and stream the answer
        let aiSummary = "";
        const answer = AI.ask(prompt, { creativity: "medium" });

        // Stream the AI answer
        answer.on("data", (chunk: string) => {
          aiSummary += chunk;
          setSummary(aiSummary);
        });

        await answer; // Wait for the AI to finish

        await fetchingToast.hide();

        await showToast({
          style: Toast.Style.Success,
          title: "Summary Generated",
        });
      } catch (error) {
        console.error("Error generating AI summary:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Generate Summary",
          message: error instanceof Error ? error.message : String(error),
          primaryAction: {
            title: "Retry",
            onAction: () => {
              window.location.reload();
            },
          },
          secondaryAction: {
            title: "Copy Error",
            onAction: (toast) => {
              navigator.clipboard.writeText(error instanceof Error ? error.stack || error.message : String(error));
              toast.hide();
            },
          },
        });
        setSummary("Failed to generate summary.");
      } finally {
        setIsLoading(false);
      }
    }

    generateSummary();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={summary || "No summary available."}
      metadata={<AccountMetadata accounts={accounts} />}
      actions={<AccountActions accounts={accounts} />}
    />
  );
}

/**
 * Component to display account metadata.
 */
function AccountMetadata({ accounts }: { accounts: Account[] }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Accounts">
        {accounts.map((account) => (
          <Detail.Metadata.TagList.Item
            key={account.id}
            text={`${account.nickname || account.name}`}
            icon={getAccountIcon(account.kind)}
            color={account.kind.toLowerCase() === "checking" ? Color.Blue : Color.Green}
          />
        ))}
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      {accounts.map((account) => (
        <Detail.Metadata.Label
          key={account.id}
          title={account.nickname || account.name}
          text={formatCurrency(account.currentBalance)}
          icon={Icon.BankNote}
        />
      ))}
    </Detail.Metadata>
  );
}

/**
 * Component to display actions in the action panel.
 */
function AccountActions({ accounts }: { accounts: Account[] }) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Accounts">
        {accounts.map((account) => (
          <ActionPanel.Submenu
            key={account.id}
            title={`Actions for ${account.nickname || account.name}`}
            icon={getAccountIcon(account.kind)}
          >
            <Action
              title="Copy Account Number"
              icon={Icon.Clipboard}
              onAction={async () => {
                await navigator.clipboard.writeText(account.accountNumber);
                await showHUD("Account Number Copied to Clipboard");
              }}
            />
            <Action
              title="Copy Routing Number"
              icon={Icon.Clipboard}
              onAction={async () => {
                await navigator.clipboard.writeText(account.routingNumber);
                await showHUD("Routing Number Copied to Clipboard");
              }}
            />
            <Action.OpenInBrowser
              title="Open in Mercury Dashboard"
              url={`https://dashboard.mercury.com/accounts/${account.id}`}
              icon={Icon.Globe}
            />
          </ActionPanel.Submenu>
        ))}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh Summary"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Refresh Summary",
              message: "Are you sure you want to refresh the summary?",
              primaryAction: {
                title: "Refresh",
                style: Alert.ActionStyle.Destructive,
              },
              dismissAction: {
                title: "Cancel",
                style: Alert.ActionStyle.Cancel,
              },
            });
            if (confirmed) {
              // Reload the command
              window.location.reload();
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * Get icon based on account kind.
 */
function getAccountIcon(kind: string): Image.ImageLike {
  switch (kind.toLowerCase()) {
    case "checking":
      return { source: Icon.BankNote, tintColor: Color.Blue };
    case "savings":
      return { source: Icon.Wallet, tintColor: Color.Green };
    default:
      return Icon.Circle;
  }
}
