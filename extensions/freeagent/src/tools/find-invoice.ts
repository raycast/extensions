import { fetchInvoices } from "../services/freeagent";
import { formatCurrencyAmount, formatDate } from "../utils/formatting";
import { provider } from "../oauth";

type Input = {
  /**
   * Search criteria for finding invoices (e.g., client name, invoice reference, amount, date range)
   */
  searchCriteria: string;
  /**
   * Specific status to filter by (optional)
   */
  status?: "draft" | "sent" | "paid" | "overdue" | "all";
};

/**
 * Find specific invoices using natural language search criteria like client name, reference, amount, or date
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const invoices = await fetchInvoices(token);

    if (invoices.length === 0) {
      return "📄 No invoices found in your FreeAgent account.";
    }

    const searchTerm = input.searchCriteria.toLowerCase();

    // Apply status filter if specified
    let filteredInvoices = invoices;
    if (input.status && input.status !== "all") {
      if (input.status === "overdue") {
        filteredInvoices = invoices.filter(
          (invoice) =>
            invoice.status === "overdue" || (invoice.status === "sent" && new Date(invoice.due_on) < new Date()),
        );
      } else {
        filteredInvoices = invoices.filter((invoice) => invoice.status === input.status);
      }
    }

    // Search through invoices based on various criteria
    const matchingInvoices = filteredInvoices.filter((invoice) => {
      const searchableText = [
        invoice.reference,
        invoice.contact_name,
        invoice.total_value,
        invoice.net_value,
        invoice.status,
        invoice.long_status,
        formatDate(invoice.dated_on),
        formatDate(invoice.due_on),
        invoice.comments || "",
        invoice.po_reference || "",
      ]
        .join(" ")
        .toLowerCase();

      // Check for amount searches (e.g., "100", "£100", "$100")
      const amountMatch = searchTerm.match(/[£$€]?(\d+(?:\.\d{2})?)/);
      if (amountMatch) {
        const searchAmount = parseFloat(amountMatch[1]);
        const invoiceAmount = parseFloat(invoice.total_value);
        const netAmount = parseFloat(invoice.net_value);

        // Allow for small variations in amount matching
        if (Math.abs(invoiceAmount - searchAmount) < 0.01 || Math.abs(netAmount - searchAmount) < 0.01) {
          return true;
        }
      }

      // Check for date searches
      const dateMatch = searchTerm.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})/);
      if (dateMatch) {
        const invoiceDateString = invoice.dated_on;
        const dueDateString = invoice.due_on;
        if (invoiceDateString.includes(dateMatch[0]) || dueDateString.includes(dateMatch[0])) {
          return true;
        }
      }

      // Text-based search
      return searchableText.includes(searchTerm);
    });

    if (matchingInvoices.length === 0) {
      return `🔍 No invoices found matching "${input.searchCriteria}". Try searching by:\n• Client name\n• Invoice reference\n• Amount (e.g., "100" or "£150.50")\n• Status (draft, sent, paid, overdue)\n• Date (YYYY-MM-DD format)`;
    }

    // Limit results to prevent overwhelming output
    const displayInvoices = matchingInvoices.slice(0, 10);

    let results = `🔍 **Found ${matchingInvoices.length} invoice(s) matching "${input.searchCriteria}"**\n\n`;

    displayInvoices.forEach((invoice, index) => {
      const statusEmoji =
        {
          draft: "📝",
          sent: "📤",
          paid: "✅",
          overdue: "🚨",
        }[invoice.status] || "📄";

      const isOverdue = invoice.status === "sent" && new Date(invoice.due_on) < new Date();
      const actualStatus = isOverdue ? "🚨 overdue" : `${statusEmoji} ${invoice.status}`;

      results += `**${index + 1}. ${invoice.reference}**\n`;
      results += `• Client: ${invoice.contact_name}\n`;
      results += `• Amount: ${formatCurrencyAmount(invoice.currency, parseFloat(invoice.total_value))}\n`;
      results += `• Status: ${actualStatus}\n`;
      results += `• Date: ${formatDate(invoice.dated_on)}\n`;
      results += `• Due: ${formatDate(invoice.due_on)}\n`;

      if (invoice.paid_value && parseFloat(invoice.paid_value) > 0) {
        results += `• Paid: ${formatCurrencyAmount(invoice.currency, parseFloat(invoice.paid_value))}\n`;
      }

      if (invoice.due_value && parseFloat(invoice.due_value) > 0) {
        results += `• Outstanding: ${formatCurrencyAmount(invoice.currency, parseFloat(invoice.due_value))}\n`;
      }

      if (invoice.comments) {
        results += `• Notes: ${invoice.comments}\n`;
      }

      results += `\n`;
    });

    if (matchingInvoices.length > 10) {
      results += `... and ${matchingInvoices.length - 10} more invoices. Try refining your search for more specific results.\n`;
    }

    // Summary statistics
    const totalValue = matchingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_value), 0);
    const paidValue = matchingInvoices.reduce((sum, inv) => sum + parseFloat(inv.paid_value || "0"), 0);
    const currency = matchingInvoices[0]?.currency || "GBP";

    results += `\n💰 **Summary**: Total ${formatCurrencyAmount(currency, totalValue)} | Paid ${formatCurrencyAmount(currency, paidValue)}`;

    return results;
  } catch (error) {
    console.error("Invoice search error:", error);
    return `❌ Unable to search invoices. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
