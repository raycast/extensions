import { fetchInvoices, fetchBankTransactions, fetchBankAccounts } from "../services/freeagent";
import { formatCurrencyAmount } from "../utils/formatting";
import { provider } from "../oauth";
import { BankTransaction } from "../types";

type Input = {
  /**
   * Time period for cash flow analysis
   */
  period?: "weekly" | "monthly" | "quarterly" | "yearly";
  /**
   * Number of periods to analyze (e.g., last 3 months, last 12 weeks)
   */
  periods?: number;
  /**
   * Include projections based on pending invoices
   */
  includeProjections?: boolean;
};

/**
 * Analyze cash flow patterns, incoming and outgoing money, and provide forecasts to help with business financial planning
 */
export default async function tool(input: Input = {}) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const [invoices, bankAccounts] = await Promise.all([fetchInvoices(token), fetchBankAccounts(token)]);

    if (invoices.length === 0 && bankAccounts.length === 0) {
      return "📊 No financial data found to analyze cash flow.";
    }

    const currency = invoices[0]?.currency || bankAccounts[0]?.currency || "GBP";
    const period = input.period || "monthly";
    const periods = input.periods || (period === "weekly" ? 12 : period === "monthly" ? 6 : 4);

    let analysis = `💰 **Cash Flow Summary**\n\n`;

    // Current financial position
    let totalBankBalance = 0;
    if (bankAccounts.length > 0) {
      bankAccounts.forEach((account) => {
        totalBankBalance += parseFloat(account.current_balance);
      });

      analysis += `🏦 **Current Bank Position**\n`;
      analysis += `• Total Balance: ${formatCurrencyAmount(currency, totalBankBalance)}\n`;

      if (bankAccounts.length > 1) {
        analysis += `• Across ${bankAccounts.length} accounts:\n`;
        bankAccounts.forEach((account) => {
          analysis += `  - ${account.name}: ${formatCurrencyAmount(currency, parseFloat(account.current_balance))}\n`;
        });
      }
      analysis += `\n`;
    }

    // Invoice-based cash flow analysis
    if (invoices.length > 0) {
      const outstandingInvoices = invoices.filter((inv) => inv.status === "sent" || inv.status === "draft");
      const overdueInvoices = invoices.filter(
        (inv) => inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_on) < new Date()),
      );

      const outstandingValue = outstandingInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.due_value || inv.total_value),
        0,
      );
      const overdueValue = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.due_value || "0"), 0);

      analysis += `📄 **Invoice Pipeline**\n`;
      analysis += `• Outstanding Invoices: ${outstandingInvoices.length} (${formatCurrencyAmount(currency, outstandingValue)})\n`;

      if (overdueValue > 0) {
        analysis += `• Overdue Amount: ${formatCurrencyAmount(currency, overdueValue)} ⚠️\n`;
      }

      // Upcoming payments (next 30 days)
      const next30Days = new Date();
      next30Days.setDate(next30Days.getDate() + 30);

      const upcomingInvoices = outstandingInvoices.filter(
        (inv) => new Date(inv.due_on) <= next30Days && new Date(inv.due_on) >= new Date(),
      );

      if (upcomingInvoices.length > 0) {
        const upcomingValue = upcomingInvoices.reduce(
          (sum, inv) => sum + parseFloat(inv.due_value || inv.total_value),
          0,
        );
        analysis += `• Expected (Next 30 days): ${formatCurrencyAmount(currency, upcomingValue)}\n`;
      }

      analysis += `\n`;
    }

    // Bank transaction analysis
    let transactionAnalysis = "";
    if (bankAccounts.length > 0) {
      let allTransactions: BankTransaction[] = [];

      for (const account of bankAccounts) {
        try {
          const transactions = await fetchBankTransactions(token, account.url);
          allTransactions = allTransactions.concat(transactions);
        } catch {
          console.warn(`Failed to fetch transactions for ${account.name}`);
        }
      }

      if (allTransactions.length > 0) {
        // Group transactions by time period
        const periodMs = {
          weekly: 7 * 24 * 60 * 60 * 1000,
          monthly: 30 * 24 * 60 * 60 * 1000,
          quarterly: 90 * 24 * 60 * 60 * 1000,
          yearly: 365 * 24 * 60 * 60 * 1000,
        };

        const periodLength = periodMs[period as keyof typeof periodMs] || periodMs.monthly;
        const periodData: { label: string; incoming: number; outgoing: number; net: number; count: number }[] = [];

        // Calculate period buckets
        for (let i = 0; i < periods; i++) {
          const periodEnd = new Date(Date.now() - i * periodLength);
          const periodStart = new Date(periodEnd.getTime() - periodLength);

          const label =
            period === "weekly"
              ? `Week ${i + 1}: ${periodStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : period === "monthly"
                ? `Period ${i + 1}: ${periodStart.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                : period === "quarterly"
                  ? `Q${Math.ceil((periodStart.getMonth() + 1) / 3)} ${periodStart.getFullYear()}`
                  : `${periodStart.getFullYear()}`;

          const periodTransactions = allTransactions.filter((t) => {
            const transDate = new Date(t.dated_on);
            return transDate >= periodStart && transDate < periodEnd;
          });

          const incoming = periodTransactions
            .filter((t) => parseFloat(t.amount) > 0)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

          const outgoing = Math.abs(
            periodTransactions
              .filter((t) => parseFloat(t.amount) < 0)
              .reduce((sum, t) => sum + parseFloat(t.amount), 0),
          );

          periodData.push({
            label,
            incoming,
            outgoing,
            net: incoming - outgoing,
            count: periodTransactions.length,
          });
        }

        transactionAnalysis += `📊 **Cash Flow Trends (${period})**\n`;
        // periodData is built most-recent-first, so iterate in natural order.
        periodData.forEach((data) => {
          const netEmoji = data.net >= 0 ? "📈" : "📉";
          transactionAnalysis += `• ${data.label}: ${netEmoji} ${formatCurrencyAmount(currency, Math.abs(data.net))}\n`;
          transactionAnalysis += `  - In: ${formatCurrencyAmount(currency, data.incoming)}\n`;
          transactionAnalysis += `  - Out: ${formatCurrencyAmount(currency, data.outgoing)}\n`;
        });

        // Calculate averages
        const totalPeriods = periodData.length;
        const avgIncoming = periodData.reduce((sum, p) => sum + p.incoming, 0) / totalPeriods;
        const avgOutgoing = periodData.reduce((sum, p) => sum + p.outgoing, 0) / totalPeriods;
        const avgNet = avgIncoming - avgOutgoing;

        const periodSingular: Record<string, string> = {
          weekly: "week",
          monthly: "month",
          quarterly: "quarter",
          yearly: "year",
        };
        transactionAnalysis += `\n📈 **Averages per ${periodSingular[period] || period}**\n`;
        transactionAnalysis += `• Incoming: ${formatCurrencyAmount(currency, avgIncoming)}\n`;
        transactionAnalysis += `• Outgoing: ${formatCurrencyAmount(currency, avgOutgoing)}\n`;
        transactionAnalysis += `• Net: ${formatCurrencyAmount(currency, avgNet)}\n\n`;
      }
    }

    analysis += transactionAnalysis;

    // Projections
    if (input.includeProjections !== false && invoices.length > 0) {
      analysis += `🔮 **Cash Flow Projections**\n`;

      // Group outstanding invoices by expected payment month
      const projectedIncoming: { [month: string]: number } = {};

      invoices
        .filter((inv) => inv.status === "sent" || inv.status === "draft")
        .forEach((inv) => {
          const dueDate = new Date(inv.due_on);
          const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`;

          if (!projectedIncoming[monthKey]) {
            projectedIncoming[monthKey] = 0;
          }
          projectedIncoming[monthKey] += parseFloat(inv.due_value || inv.total_value);
        });

      const next3Months = Object.entries(projectedIncoming)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 3);

      if (next3Months.length > 0) {
        next3Months.forEach(([month, amount]) => {
          const [year, monthNum] = month.split("-");
          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          analysis += `• ${monthName}: ${formatCurrencyAmount(currency, amount)} expected\n`;
        });
      }

      analysis += `\n`;
    }

    // Key insights and recommendations
    analysis += `💡 **Key Insights**\n`;

    if (bankAccounts.length > 0) {
      if (totalBankBalance < 0) {
        analysis += `• ⚠️ Negative bank balance - immediate attention needed\n`;
      } else if (totalBankBalance > 0) {
        analysis += `• ✅ Positive bank balance of ${formatCurrencyAmount(currency, totalBankBalance)}\n`;
      }
    }

    if (invoices.length > 0) {
      const overdueInvoices = invoices.filter(
        (inv) => inv.status === "overdue" || (inv.status === "sent" && new Date(inv.due_on) < new Date()),
      );

      if (overdueInvoices.length > 0) {
        analysis += `• 🚨 ${overdueInvoices.length} overdue invoices need collection follow-up\n`;
      }

      const draftInvoices = invoices.filter((inv) => inv.status === "draft");
      if (draftInvoices.length > 0) {
        analysis += `• 📝 ${draftInvoices.length} draft invoices ready to be sent\n`;
      }
    }

    return analysis;
  } catch (error) {
    console.error("Cash flow analysis error:", error);
    return `❌ Unable to analyze cash flow. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
