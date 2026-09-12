import { fetchInvoices, fetchContacts } from "../services/freeagent";
import { formatCurrencyAmount, formatDate } from "../utils/formatting";
import { provider } from "../oauth";
import { Invoice, Contact } from "../types";

type Input = {
  /**
   * The client name to analyze (optional - if not provided, analyzes all clients)
   */
  clientName?: string;
  /**
   * Type of analysis to perform
   */
  analysisType?: "payment-patterns" | "revenue" | "overdue" | "top-clients" | "summary";
  /**
   * Number of months to look back for analysis (default: 12)
   */
  months?: number;
};

/**
 * Analyze client payment patterns, revenue contributions, and business relationships to provide insights about your customers
 */
export default async function tool(input: Input = {}) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const [invoices, contacts] = await Promise.all([fetchInvoices(token), fetchContacts(token)]);

    if (invoices.length === 0) {
      return "📊 No invoices found to analyze client insights.";
    }

    if (contacts.length === 0) {
      return "👥 No contacts found in your FreeAgent account.";
    }

    // Filter by date range
    const monthsBack = input.months || 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

    const relevantInvoices = invoices.filter((invoice) => new Date(invoice.dated_on) >= cutoffDate);

    // Group invoices by contact
    const clientData: {
      [contactUrl: string]: {
        contact: Contact;
        invoices: Invoice[];
        totalValue: number;
        paidValue: number;
        overdueValue: number;
        averagePaymentDays: number;
        paymentCount: number;
      };
    } = {};

    relevantInvoices.forEach((invoice) => {
      if (!clientData[invoice.contact]) {
        const contact = contacts.find((c) => c.url === invoice.contact);
        clientData[invoice.contact] = {
          contact: contact || {
            url: invoice.contact,
            organisation_name: invoice.contact_name,
            contact_name_on_invoices: false,
            status: "active",
            created_at: "",
            updated_at: "",
          },
          invoices: [],
          totalValue: 0,
          paidValue: 0,
          overdueValue: 0,
          averagePaymentDays: 0,
          paymentCount: 0,
        };
      }

      const client = clientData[invoice.contact];
      client.invoices.push(invoice);
      client.totalValue += parseFloat(invoice.total_value);
      client.paidValue += parseFloat(invoice.paid_value || "0");

      if (invoice.status === "overdue" || (invoice.status === "sent" && new Date(invoice.due_on) < new Date())) {
        client.overdueValue += parseFloat(invoice.due_value || "0");
      }

      // Calculate payment days for paid invoices
      if (invoice.status === "paid" && invoice.paid_on) {
        const invoiceDate = new Date(invoice.dated_on);
        const paidDate = new Date(invoice.paid_on);
        const paymentDays = Math.ceil((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 3600 * 24));

        client.averagePaymentDays =
          (client.averagePaymentDays * client.paymentCount + paymentDays) / (client.paymentCount + 1);
        client.paymentCount++;
      }
    });

    let analysis = `👥 **Client Insights Analysis**\n\n`;

    // Filter by specific client if requested
    if (input.clientName) {
      const searchName = input.clientName.toLowerCase();
      const matchingClients = Object.values(clientData).filter((client) => {
        const orgName = client.contact.organisation_name || "";
        const fullName = `${client.contact.first_name || ""} ${client.contact.last_name || ""}`.trim();
        return orgName.toLowerCase().includes(searchName) || fullName.toLowerCase().includes(searchName);
      });

      if (matchingClients.length === 0) {
        return `🔍 No client found matching "${input.clientName}". Available clients:\n${Object.values(clientData)
          .slice(0, 10)
          .map((c) => `• ${c.contact.organisation_name || `${c.contact.first_name} ${c.contact.last_name}`}`)
          .join("\n")}`;
      }

      const client = matchingClients[0];
      const clientName = client.contact.organisation_name || `${client.contact.first_name} ${client.contact.last_name}`;
      const currency = client.invoices[0]?.currency || "GBP";

      analysis += `👤 **${clientName} - Detailed Analysis**\n\n`;
      analysis += `💰 **Financial Summary**\n`;
      analysis += `• Total Revenue: ${formatCurrencyAmount(currency, client.totalValue)}\n`;
      analysis += `• Amount Paid: ${formatCurrencyAmount(currency, client.paidValue)}\n`;
      analysis += `• Outstanding: ${formatCurrencyAmount(currency, client.totalValue - client.paidValue)}\n`;

      if (client.overdueValue > 0) {
        analysis += `• Overdue Amount: ${formatCurrencyAmount(currency, client.overdueValue)}\n`;
      }

      analysis += `\n📊 **Invoice Activity**\n`;
      analysis += `• Total Invoices: ${client.invoices.length}\n`;

      const statusCounts = client.invoices.reduce((counts: { [status: string]: number }, inv) => {
        counts[inv.status] = (counts[inv.status] || 0) + 1;
        return counts;
      }, {});

      Object.entries(statusCounts).forEach(([status, count]) => {
        analysis += `• ${status}: ${count}\n`;
      });

      if (client.paymentCount > 0) {
        analysis += `\n⏱️ **Payment Behavior**\n`;
        analysis += `• Average Payment Time: ${Math.round(client.averagePaymentDays)} days\n`;
        analysis += `• Payment Rate: ${((client.paymentCount / client.invoices.length) * 100).toFixed(1)}%\n`;
      }

      // Recent activity
      const recentInvoices = client.invoices
        .filter((inv) => new Date(inv.dated_on) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .sort((a, b) => new Date(b.dated_on).getTime() - new Date(a.dated_on).getTime());

      if (recentInvoices.length > 0) {
        analysis += `\n📅 **Recent Activity (Last 90 Days)**\n`;
        recentInvoices.slice(0, 5).forEach((invoice) => {
          const statusEmoji = { draft: "📝", sent: "📤", paid: "✅", overdue: "🚨" }[invoice.status] || "📄";
          analysis += `• ${invoice.reference} - ${formatCurrencyAmount(currency, parseFloat(invoice.total_value))} ${statusEmoji} (${formatDate(invoice.dated_on)})\n`;
        });
      }

      return analysis;
    }

    // Overall client analysis
    const clients = Object.values(clientData);
    const currency = invoices[0]?.currency || "GBP";

    if (input.analysisType === "top-clients" || !input.analysisType) {
      analysis += `🏆 **Top Clients by Revenue**\n`;
      const totalClientRevenue = clients.reduce((sum, c) => sum + c.totalValue, 0);
      clients
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10)
        .forEach((client, index) => {
          const clientName =
            client.contact.organisation_name || `${client.contact.first_name} ${client.contact.last_name}`;
          const percentage = totalClientRevenue > 0 ? (client.totalValue / totalClientRevenue) * 100 : 0;

          analysis += `${index + 1}. **${clientName}**\n`;
          analysis += `   • Revenue: ${formatCurrencyAmount(currency, client.totalValue)} (${percentage.toFixed(1)}%)\n`;
          analysis += `   • Invoices: ${client.invoices.length}\n`;

          if (client.paymentCount > 0) {
            analysis += `   • Avg Payment: ${Math.round(client.averagePaymentDays)} days\n`;
          }

          if (client.overdueValue > 0) {
            analysis += `   • Overdue: ${formatCurrencyAmount(currency, client.overdueValue)}\n`;
          }

          analysis += `\n`;
        });
    }

    if (input.analysisType === "payment-patterns" || !input.analysisType) {
      analysis += `⏱️ **Payment Pattern Analysis**\n`;

      const payingClients = clients.filter((c) => c.paymentCount > 0);
      payingClients.sort((a, b) => a.averagePaymentDays - b.averagePaymentDays);

      const fastPayers = payingClients.filter((c) => c.averagePaymentDays <= 14);
      const slowPayers = payingClients.filter((c) => c.averagePaymentDays > 30);

      analysis += `• Fast Payers (≤14 days): ${fastPayers.length} clients\n`;
      analysis += `• Slow Payers (>30 days): ${slowPayers.length} clients\n`;

      if (payingClients.length > 0) {
        const avgPaymentDays = payingClients.reduce((sum, c) => sum + c.averagePaymentDays, 0) / payingClients.length;
        analysis += `• Overall Average: ${Math.round(avgPaymentDays)} days\n`;
      }

      analysis += `\n`;
    }

    if (input.analysisType === "overdue" || !input.analysisType) {
      const overdueClients = clients.filter((c) => c.overdueValue > 0);

      if (overdueClients.length > 0) {
        analysis += `🚨 **Clients with Overdue Amounts**\n`;
        overdueClients
          .sort((a, b) => b.overdueValue - a.overdueValue)
          .slice(0, 8)
          .forEach((client) => {
            const clientName =
              client.contact.organisation_name || `${client.contact.first_name} ${client.contact.last_name}`;
            analysis += `• ${clientName}: ${formatCurrencyAmount(currency, client.overdueValue)}\n`;
          });

        const totalOverdue = overdueClients.reduce((sum, c) => sum + c.overdueValue, 0);
        analysis += `\n💰 **Total Overdue**: ${formatCurrencyAmount(currency, totalOverdue)}\n\n`;
      }
    }

    if (input.analysisType === "summary" || !input.analysisType) {
      const totalRevenue = clients.reduce((sum, c) => sum + c.totalValue, 0);
      const totalPaid = clients.reduce((sum, c) => sum + c.paidValue, 0);
      const totalOverdue = clients.reduce((sum, c) => sum + c.overdueValue, 0);

      analysis += `📈 **Overall Summary**\n`;
      analysis += `• Active Clients: ${clients.length}\n`;
      analysis += `• Total Revenue: ${formatCurrencyAmount(currency, totalRevenue)}\n`;
      analysis += `• Total Paid: ${formatCurrencyAmount(currency, totalPaid)}\n`;
      analysis += `• Total Overdue: ${formatCurrencyAmount(currency, totalOverdue)}\n`;
      analysis += `• Collection Rate: ${totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : "N/A"}%\n`;
    }

    return analysis;
  } catch (error) {
    console.error("Client insights error:", error);
    return `❌ Unable to analyze client insights. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
