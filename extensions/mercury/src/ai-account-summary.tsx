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
  useNavigation,
  showHUD,
  Form,
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

const AI_MODELS = [
  { value: "openai-gpt-4", title: "OpenAI GPT-4" },
  { value: "openai-gpt4o-mini", title: "OpenAI GPT-4o mini" },
  { value: "openai-gpt4o", title: "OpenAI GPT-4o" },
  { value: "anthropic-claude-haiku", title: "Anthropic Claude Haiku" },
  { value: "anthropic-claude-sonnet", title: "Anthropic Claude Sonnet" },
];

// Function to map string values to AI.Model enums
function getAIModelEnum(value: string): AI.Model {
  switch (value) {
    case "openai-gpt-4":
      return AI.Model["OpenAI_GPT4"];
    case "openai-gpt4o":
      return AI.Model["OpenAI_GPT4o"];
    case "openai-gpt4o-mini":
      return AI.Model["OpenAI_GPT4o-mini"];
    case "anthropic-claude-haiku":
      return AI.Model.Anthropic_Claude_Haiku;
    case "anthropic-claude-sonnet":
      return AI.Model.Anthropic_Claude_Sonnet;
    default:
      return AI.Model["OpenAI_GPT4o"]; // Default model
  }
}

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
 * Fetch transactions for a specific account over the last 12 months.
 */
async function fetchTransactions(apiKey: string, accountId: string): Promise<Transaction[]> {
  let allTransactions: Transaction[] = [];
  let offset = 0;
  const limit = 500;

  // Calculate the date 12 months ago
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const startDate = twelveMonthsAgo.toISOString().split("T")[0]; // Format as YYYY-MM-DD

  let total = 0;

  do {
    const response = await fetch(
      `${API_BASE_URL}/account/${accountId}/transactions?limit=${limit}&offset=${offset}&start=${startDate}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions for account ${accountId}: ${response.statusText}`);
    }

    const data = (await response.json()) as { total: number; transactions: Transaction[] };
    total = data.total;
    allTransactions = allTransactions.concat(data.transactions);
    offset += data.transactions.length;
  } while (offset < total);

  return allTransactions;
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
 * Group transactions by month.
 */
function groupTransactionsByMonth(transactions: Transaction[]): Array<{
  month: string;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
}> {
  const monthsMap: Record<string, { totalInflows: number; totalOutflows: number; netCashFlow: number }> = {};

  transactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    const month = date.toLocaleString("default", { month: "long", year: "numeric" });

    if (!monthsMap[month]) {
      monthsMap[month] = { totalInflows: 0, totalOutflows: 0, netCashFlow: 0 };
    }

    if (transaction.amount > 0) {
      monthsMap[month].totalInflows += transaction.amount;
    } else {
      monthsMap[month].totalOutflows += transaction.amount;
    }
    monthsMap[month].netCashFlow += transaction.amount;
  });

  // Convert the monthsMap to an array and sort by date descending
  return Object.entries(monthsMap)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());
}

/**
 * Prepare the prompt to send to Raycast AI.
 */
function prepareDataForAI(accounts: Account[], transactions: Transaction[]): string {
  // Get legal business name from accounts (assuming all accounts belong to the same business)
  const legalBusinessName = accounts[0]?.legalBusinessName || "the business";

  // Include the monthly summary in the prompt
  const monthlyTransactions = groupTransactionsByMonth(transactions);

  const prompt = `You are an experienced financial analyst tasked with preparing a concise monthly financial briefing for **${legalBusinessName}**. Analyze the provided account information and recent transactions to generate a clear and professional summary.

**Instructions:**

- **Overall Financial Health**:
  - Provide a brief overview of the total current and available balances.
  - Summarize the net cash flow over the last 30 days.
  - Assess the financial health status (e.g., Strong, Stable, Weak) based on balances and cash flow.

- **Key Observations**:
  - Highlight significant patterns or trends over the past 12 months using the monthly transaction summaries.
  - Note any unusual account activities or transaction statuses.

- **Significant Transactions**:
  - List the top 3 transactions by amount.
  - Provide brief details for each, including counterparty, amount, date, type, and impact.

- **Recommendations**:
  - Offer concise, actionable suggestions for financial improvement.
  - Focus on strategies to enhance cash flow and financial health.

**Formatting Guidelines:**

- Present the summary in **Markdown** format.
- Use appropriate **headings** and **bullet points** for readability.
- **Do not use backslashes or special characters that may cause rendering issues.**
- **Avoid using any non-standard Unicode characters.**
- Keep the summary concise and limited to the most relevant information.
- Keep the tone professional and objective.

**Data Provided:**

**Accounts:**

${accounts
  .map((account) => {
    return `- **${account.nickname || account.name}** (${capitalize(account.kind)} Account)
        - Balance: ${formatCurrency(account.currentBalance)}
        - Available Balance: ${formatCurrency(account.availableBalance)}
        - Status: ${capitalize(account.status)}
        - Type: ${capitalize(account.type)}
        - Created At: ${new Date(account.createdAt).toLocaleDateString()}
        `;
  })
  .join("\n")}

**Monthly Transaction Summary (Last 12 Months):**

${monthlyTransactions
  .map(
    (month) => `- **${month.month}**:
    - Total Inflows: ${formatCurrency(month.totalInflows)}
    - Total Outflows: ${formatCurrency(Math.abs(month.totalOutflows))}
    - Net Cash Flow: ${formatCurrency(month.netCashFlow)}`,
  )
  .join("\n")}

**Transaction Status Summary (Last 30 Days):**

${(() => {
  const recentTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return transactionDate >= thirtyDaysAgo;
  });

  const transactionStatusCounts = recentTransactions.reduce(
    (counts, transaction) => {
      counts[transaction.status] = (counts[transaction.status] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );

  return Object.entries(transactionStatusCounts)
    .map(([status, count]) => `- ${capitalize(status)}: ${count} transactions`)
    .join("\n");
})()}

**Cash Flow Summary (Last 30 Days):**

- Total Inflows: ${formatCurrency(
    transactions
      .filter((tx) => {
        const transactionDate = new Date(tx.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return transactionDate >= thirtyDaysAgo && tx.amount > 0;
      })
      .reduce((sum, tx) => sum + tx.amount, 0),
  )}
- Total Outflows: ${formatCurrency(
    Math.abs(
      transactions
        .filter((tx) => {
          const transactionDate = new Date(tx.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return transactionDate >= thirtyDaysAgo && tx.amount < 0;
        })
        .reduce((sum, tx) => sum + tx.amount, 0),
    ),
  )}
- Net Cash Flow: ${formatCurrency(
    transactions
      .filter((tx) => {
        const transactionDate = new Date(tx.createdAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return transactionDate >= thirtyDaysAgo;
      })
      .reduce((sum, tx) => sum + tx.amount, 0),
  )}

**Please proceed to generate the concise monthly financial briefing based on the instructions above.**`;

  return prompt;
}

/**
 * Function to sanitize the AI's response by removing invalid characters.
 */
function sanitizeAIResponse(response: string): string {
  // Remove OBJECT REPLACEMENT CHARACTER and any other invalid Unicode characters
  response = response.replace(/\uFFFC/g, "");

  // Remove unnecessary backslashes
  response = response.replace(/\\/g, "");

  // Trim any excessive whitespace
  response = response.trim();

  return response;
}

/**
 * Conversation message interface
 */
interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Main component for the AI Account Summary command with interactive chat.
 */
export default function AIAccountSummaryCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [, setSummary] = useState<string>("");
  const { apiKey } = getPreferenceValues<Preferences>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);

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

      // Use AI.ask to get the summary
      const initialSummary = await AI.ask(prompt, { creativity: "medium" });

      // Sanitize the AI's response
      const sanitizedSummary = sanitizeAIResponse(initialSummary);

      setSummary(sanitizedSummary);

      // Initialize conversation with the sanitized summary
      setConversation([
        {
          role: "assistant",
          content: sanitizedSummary,
        },
      ]);

      await fetchingToast.hide();

      await showToast({
        style: Toast.Style.Success,
        title: "Summary Generated",
      });
    } catch (error) {
      // Handle error here, e.g., by showing a Toast
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Generate Summary",
        message: error instanceof Error ? error.message : String(error),
        primaryAction: {
          title: "Retry",
          onAction: async (toast) => {
            await toast.hide();
            setIsLoading(true);
            // Re-run your initialization logic
            generateSummary();
          },
        },
      });
      setSummary("Failed to generate summary.");
    } finally {
      setIsLoading(false);
    }
  }
  useEffect(() => {
    generateSummary();
  }, []);

  // Handle follow-up questions
  async function handleSubmit(followUpQuestion: string, modelValue: string) {
    const model = getAIModelEnum(modelValue);

    if (!followUpQuestion) {
      return;
    }

    setIsLoading(true);

    // Update conversation with user's question
    const updatedConversation: ConversationMessage[] = [...conversation, { role: "user", content: followUpQuestion }];

    setConversation(updatedConversation);

    try {
      // Build conversation history into the prompt
      const fullPrompt = `You are a financial analyst assistant. Continue the conversation below and provide detailed, professional responses to the user's questions.

**Conversation History:**

${updatedConversation
  .map((msg) => {
    const role = msg.role === "user" ? "User" : "Assistant";
    return `**${role}**: ${msg.content}`;
  })
  .join("\n\n")}

**Instructions:**

- Provide clear and concise answers.
- Use professional language and financial terminology.
- If calculations are needed, show your work.
- Reference data from the summary or transactions if applicable.
- Do not include irrelevant information.
- Keep the response concise and focused.

**Proceed to answer the user's last question.**`;

      // Use AI.ask to get the answer, specifying the selected model
      const answer = await AI.ask(fullPrompt, { creativity: "medium", model });

      // Sanitize the AI's response
      const sanitizedAnswer = sanitizeAIResponse(answer);

      const newConversation: ConversationMessage[] = [
        ...updatedConversation,
        { role: "assistant", content: sanitizedAnswer },
      ];
      setConversation(newConversation);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Build the conversation markdown with latest messages at the top
  const conversationMarkdown = buildConversationMarkdown(conversation);

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
      markdown={conversationMarkdown || "No summary available."}
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
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Ask Follow-up Question"
              icon={Icon.Message}
              target={<AskFollowUpQuestionForm onSubmit={handleSubmit} />}
            />
            <Action.CopyToClipboard content={conversationMarkdown} title="Copy Conversation" />
            {/* Other actions */}
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
                  setIsLoading(true);
                  setAccounts([]);
                  setTransactions([]);
                  setConversation([]);
                  setSummary("");
                  // Re-run the initialization logic
                  generateSummary();
                }
              }}
            />
          </ActionPanel.Section>
          {/* Account Actions */}
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
        </ActionPanel>
      }
    />
  );
}

/**
 * Function to build the conversation markdown with exchanges grouped
 */
function buildConversationMarkdown(conversation: ConversationMessage[]): string {
  // Group the conversation into exchanges
  const exchanges: { userMessage?: ConversationMessage; assistantMessage?: ConversationMessage }[] = [];
  let currentExchange: { userMessage?: ConversationMessage; assistantMessage?: ConversationMessage } = {};

  for (const message of conversation) {
    if (message.role === "user") {
      if (currentExchange.userMessage || currentExchange.assistantMessage) {
        exchanges.push(currentExchange);
      }
      currentExchange = { userMessage: message };
    } else if (message.role === "assistant") {
      if (currentExchange.userMessage && !currentExchange.assistantMessage) {
        currentExchange.assistantMessage = message;
        exchanges.push(currentExchange);
        currentExchange = {};
      } else {
        if (currentExchange.userMessage || currentExchange.assistantMessage) {
          exchanges.push(currentExchange);
        }
        currentExchange = { assistantMessage: message };
      }
    }
  }

  if (currentExchange.userMessage || currentExchange.assistantMessage) {
    exchanges.push(currentExchange);
  }

  // Reverse the exchanges to have the latest at the top
  const reversedExchanges = exchanges.reverse();

  // Build the markdown string
  const markdown = reversedExchanges
    .map(({ userMessage, assistantMessage }) => {
      let exchangeText = "";
      if (userMessage) {
        exchangeText += `**You**:\n\`\`\`\n${userMessage.content.trim()}\n\`\`\``; // Code block formatting
      }
      if (assistantMessage) {
        if (userMessage) {
          exchangeText += `\n\n`; // Line break between question and response
        }
        exchangeText += `**Assistant**:\n${assistantMessage.content.trim()}`;
      }
      return exchangeText.trim();
    })
    .join("\n\n***\n\n"); // Separator between exchanges

  return markdown;
}

/**
 * Component for the follow-up question form.
 */
function AskFollowUpQuestionForm(props: { onSubmit: (question: string, modelValue: string) => void }) {
  const [question, setQuestion] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("openai-gpt4o"); // Default model is now GPT-4o
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Ask Follow-up Question"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Question"
            onSubmit={() => {
              props.onSubmit(question, selectedModel);
              pop(); // Pop the form view to return to the main view
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="followUpQuestion"
        title="Your Question"
        placeholder="Type your follow-up question here..."
        value={question}
        onChange={setQuestion}
      />
      <Form.Dropdown
        id="aiModel"
        title="AI Model"
        value={selectedModel}
        onChange={(newValue) => setSelectedModel(newValue)}
        storeValue
        info="Select the AI model to use for generating the response."
      >
        {AI_MODELS.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
        ))}
      </Form.Dropdown>
    </Form>
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
