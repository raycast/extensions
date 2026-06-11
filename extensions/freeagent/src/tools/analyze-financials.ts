import { fetchInvoices } from "../services/freeagent";
import { formatCurrencyAmount } from "../utils/formatting";
import { provider } from "../oauth";

type Input = {
  /**
   * The type of financial analysis to perform. For cash-flow analysis, use
   * the dedicated `cash-flow-summary` tool instead.
   */
  analysisType?: "overview" | "invoices" | "overdue";
  /**
   * Time period for analysis (e.g., "last 30 days", "this month", "this year")
   */
  period?: string;
};

/**
 * Analyze financial data and provide insights about invoices, cash flow, and business performance
 */
export default async function tool(input: Input = {}) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const invoices = await fetchInvoices(token);

    // Calculate key financial metrics
    const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_value), 0);
    const paidValue = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.paid_value || "0"), 0);
    const overdueInvoices = invoices.filter(
      (invoice) => invoice.status === "overdue" || (invoice.status === "sent" && new Date(invoice.due_on) < new Date()),
    );
    const overdueValue = overdueInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.due_value || "0"), 0);

    const draftInvoices = invoices.filter((invoice) => invoice.status === "draft");
    const sentInvoices = invoices.filter((invoice) => invoice.status === "sent");
    const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");

    let analysis = "";

    if (input.analysisType === "overview" || !input.analysisType) {
      analysis += `📊 **Financial Overview**\n\n`;
      analysis += `💰 **Total Invoice Value**: ${formatCurrencyAmount(invoices[0]?.currency || "GBP", totalInvoiceValue)}\n`;
      analysis += `✅ **Paid Amount**: ${formatCurrencyAmount(invoices[0]?.currency || "GBP", paidValue)}\n`;
      analysis += `⚠️ **Overdue Amount**: ${formatCurrencyAmount(invoices[0]?.currency || "GBP", overdueValue)}\n\n`;
    }

    if (input.analysisType === "invoices" || !input.analysisType) {
      analysis += `📋 **Invoice Status Summary**\n`;
      analysis += `• Draft: ${draftInvoices.length} invoices\n`;
      analysis += `• Sent: ${sentInvoices.length} invoices\n`;
      analysis += `• Paid: ${paidInvoices.length} invoices\n`;
      analysis += `• Overdue: ${overdueInvoices.length} invoices\n\n`;
    }

    if (overdueInvoices.length > 0 && (input.analysisType === "overdue" || !input.analysisType)) {
      analysis += `🚨 **Overdue Invoices Requiring Attention**\n`;
      overdueInvoices.slice(0, 5).forEach((invoice) => {
        const daysPastDue = Math.ceil((new Date().getTime() - new Date(invoice.due_on).getTime()) / (1000 * 3600 * 24));
        analysis += `• ${invoice.reference} - ${invoice.contact_name} - ${formatCurrencyAmount(invoice.currency, parseFloat(invoice.due_value || "0"))} (${daysPastDue} days overdue)\n`;
      });
      if (overdueInvoices.length > 5) {
        analysis += `... and ${overdueInvoices.length - 5} more overdue invoices\n`;
      }
      analysis += `\n`;
    }

    // Recent invoice trends
    const recentInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.dated_on);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return invoiceDate >= thirtyDaysAgo;
    });

    if (recentInvoices.length > 0) {
      const recentValue = recentInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total_value), 0);
      analysis += `📈 **Recent Activity (Last 30 Days)**\n`;
      analysis += `• ${recentInvoices.length} invoices created\n`;
      analysis += `• Total value: ${formatCurrencyAmount(invoices[0]?.currency || "GBP", recentValue)}\n\n`;
    }

    // Payment efficiency
    const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
    analysis += `💡 **Business Insights**\n`;
    analysis += `• Payment Rate: ${paymentRate.toFixed(1)}% of invoices are paid\n`;

    if (overdueValue > 0) {
      analysis += `• Cash Flow Impact: ${formatCurrencyAmount(invoices[0]?.currency || "GBP", overdueValue)} tied up in overdue invoices\n`;
    }

    const avgInvoiceValue = invoices.length > 0 ? totalInvoiceValue / invoices.length : 0;
    analysis += `• Average Invoice Value: ${formatCurrencyAmount(invoices[0]?.currency || "GBP", avgInvoiceValue)}\n`;

    return analysis;
  } catch (error) {
    console.error("Financial analysis error:", error);
    return `❌ Unable to analyze financial data. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
