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
  details: Record<string, unknown> | null;
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
  currencyExchangeInfo: Record<string, unknown> | null;
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

const API_BASE_URL = "https://api.mercury.com/api/v1/";

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
  // Get legal business name from accounts (assuming all accounts belong to the same business)
  const legalBusinessName = accounts[0]?.legalBusinessName || "the business";

  let prompt = `You are an experienced financial advisor preparing a concise monthly financial briefing for "${legalBusinessName}". Based on the following detailed account information and recent transactions, please analyze the data and provide a clear, professional summary.

Your briefing should include:

1. **Overall Financial Health**: Summarize the financial status, highlighting key figures and any significant changes over the month, including cash flow.
2. **Key Observations**: Note any significant patterns, trends, or events, such as changes in balances, unusual account activity, or transaction statuses.
3. **Significant Transactions**: Mention any noteworthy transactions, their details, and their impact on the financial status.
4. **Recommendations**: Offer brief, actionable suggestions for financial improvement.

Please ensure the summary is clear and concise, using a professional tone. Do not address the reader directly as a client. Present the information in Markdown format with appropriate headings and bullet points for readability.

---

**Accounts:**
`;
  accounts.forEach((account) => {
    prompt += `- **${account.nickname || account.name}** (${capitalize(account.kind)} Account)
    - Balance: ${formatCurrency(account.currentBalance)}
    - Available Balance: ${formatCurrency(account.availableBalance)}
    - Status: ${capitalize(account.status)}
    - Type: ${capitalize(account.type)}
    - Created At: ${new Date(account.createdAt).toLocaleDateString()}
    \n`;
  });

  // Calculate total balances
  const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const totalAvailableBalance = accounts.reduce((sum, account) => sum + account.availableBalance, 0);

  prompt += `\n**Total Account Balances:**\n`;
  prompt += `- Total Current Balance: ${formatCurrency(totalBalance)}\n`;
  prompt += `- Total Available Balance: ${formatCurrency(totalAvailableBalance)}\n`;

  // Filter transactions from the last 12 months
  const recentTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.createdAt);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    return transactionDate >= twelveMonthsAgo;
  });

  prompt += `\n**Recent Transactions (Last 12 Months):**\n`;
  recentTransactions.forEach((transaction) => {
    prompt += `- **${transaction.counterpartyName || "N/A"}**
    - Amount: ${formatCurrency(transaction.amount)} (${transaction.amount < 0 ? "Debit" : "Credit"})
    - Date: ${transaction.createdAt.slice(0, 10)}
    - Type: ${capitalize(transaction.kind.replace(/([A-Z])/g, " $1"))}
    - Status: ${capitalize(transaction.status)}
    - Note: ${transaction.note || "N/A"}
    - Mercury Category: ${transaction.mercuryCategory || "N/A"}
    - Attachments: ${
      transaction.attachments && transaction.attachments.length > 0
        ? transaction.attachments.map((att) => att.fileName).join(", ")
        : "None"
    }\n`;
  });

  // Summarize transaction statuses
  const transactionStatusCounts = recentTransactions.reduce(
    (counts, transaction) => {
      counts[transaction.status] = (counts[transaction.status] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  prompt += `\n**Transaction Status Summary (Last 30 Days):**\n`;
  Object.entries(transactionStatusCounts).forEach(([status, count]) => {
    prompt += `- ${capitalize(status)}: ${count} transactions\n`;
  });

  // Calculate total inflows and outflows
  const totalInflows = recentTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);

  const totalOutflows = recentTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0);

  prompt += `\n**Cash Flow Summary (Last 30 Days):**\n`;
  prompt += `- Total Inflows: ${formatCurrency(totalInflows)}\n`;
  prompt += `- Total Outflows: ${formatCurrency(Math.abs(totalOutflows))}\n`;
  prompt += `- Net Cash Flow: ${formatCurrency(totalInflows + totalOutflows)}\n`;

  prompt += `\n**Please provide the monthly financial briefing below:**`;
  return prompt;
}

/**
 * Main component for the AI Account Summary command.
 */
export default function AIAccountSummaryCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const { apiKey } = getPreferenceValues<Preferences>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
        const fetchedTransactions = await fetchAllTransactions(apiKey, fetchedAccounts);
        setTransactions(fetchedTransactions);

        // Prepare prompt
        const prompt = prepareDataForAI(fetchedAccounts, fetchedTransactions);

        // Update the toast
        fetchingToast.title = "Generating summary...";

        // Use AI.ask to get the summary and stream the answer
        let aiSummary = "";
        const answer = AI.ask(prompt, {
          creativity: "medium",
        });

        // Listen to "data" event to stream the answer
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

        // Handle error here, e.g., by showing a Toast
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
        });
        setSummary("Failed to generate summary.");
      } finally {
        setIsLoading(false);
      }
    }

    generateSummary();
  }, []);

  // Calculations for financial metrics
  let totalCurrentBalance = 0;
  let totalAvailableBalance = 0;
  let totalInflows = 0;
  let totalOutflows = 0;
  let netCashFlow = 0;
  let significantTransactions: Transaction[] = [];

  if (!isLoading && accounts.length > 0) {
    totalCurrentBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);
    totalAvailableBalance = accounts.reduce((sum, account) => sum + account.availableBalance, 0);
  }

  if (!isLoading && transactions.length > 0) {
    const recentTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return transactionDate >= thirtyDaysAgo;
    });

    totalInflows = recentTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);

    totalOutflows = recentTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0);

    netCashFlow = totalInflows + totalOutflows;

    significantTransactions = [...recentTransactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 3);
  }

  // Determine Financial Health Status
  let financialHealthStatus = "Unknown";
  let financialHealthColor: Color.ColorLike = Color.SecondaryText;

  if (totalCurrentBalance > 100000 && netCashFlow >= 0) {
    financialHealthStatus = "Strong";
    financialHealthColor = Color.Green;
  } else if (totalCurrentBalance > 50000 && netCashFlow >= -5000) {
    financialHealthStatus = "Stable";
    financialHealthColor = Color.Orange;
  } else {
    financialHealthStatus = "Weak";
    financialHealthColor = Color.Red;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={summary || "No summary available."}
      metadata={
        !isLoading &&
        accounts.length > 0 && (
          <Detail.Metadata>
            {/* Overall Financial Health */}
            <Detail.Metadata.TagList title="Overall Financial Health">
              <Detail.Metadata.TagList.Item text={financialHealthStatus} color={financialHealthColor} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Total Available Balance" text={formatCurrency(totalAvailableBalance)} />
            <Detail.Metadata.Separator />

            {/* Cash Flow Summary */}
            <Detail.Metadata.TagList title="Monthly Cash Flow Summary">
              <Detail.Metadata.TagList.Item text={formatCurrency(netCashFlow)} color={financialHealthColor} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Total Inflows" text={formatCurrency(totalInflows)} />
            <Detail.Metadata.Label title="Total Outflows" text={formatCurrency(Math.abs(totalOutflows))} />
            <Detail.Metadata.Separator />

            {/* Accounts */}
            {accounts.map((account) => (
              <Detail.Metadata.Label
                key={account.id}
                title={`${account.nickname || account.name} (${capitalize(account.kind)} Account)`}
                text={formatCurrency(account.currentBalance)}
                icon={getAccountIcon(account.kind)}
              />
            ))}
            <Detail.Metadata.Separator />

            {/* Significant Transactions */}
            {significantTransactions.length > 0 ? (
              significantTransactions.map((transaction) => (
                <Detail.Metadata.Label
                  key={transaction.id}
                  title={`${transaction.counterpartyName || "N/A"} (${capitalize(
                    transaction.kind.replace(/([A-Z])/g, " $1"),
                  )})`}
                  text={formatCurrency(transaction.amount)}
                />
              ))
            ) : (
              <Detail.Metadata.Label title="No significant transactions" text=" " />
            )}
          </Detail.Metadata>
        )
      }
      actions={<AccountActions accounts={accounts} summary={summary} />}
    />
  );
}

/**
 * Component to display actions in the action panel.
 */
function AccountActions({ accounts, summary }: { accounts: Account[]; summary: string }) {
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
        <Action.CopyToClipboard content={summary} title="Copy Summary" />
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
 * Helper functions
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

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
