import { Tool } from "@raycast/api";
import { fetchContacts, createInvoice } from "../services/freeagent";
import { InvoiceCreateData } from "../types";
import { provider } from "../oauth";

type Input = {
  /**
   * The client or customer name to create the invoice for
   */
  clientName: string;
  /**
   * The invoice amount or description of services/products
   */
  invoiceDetails: string;
  /**
   * Payment terms in days (e.g., 30, 14, 7)
   */
  paymentTerms?: number;
  /**
   * Invoice reference or number (optional)
   */
  reference?: string;
  /**
   * Whether to send email notification to the client. Defaults to false because this tool
   * creates the invoice without line items — sending immediately would email a blank
   * invoice. Set to true only after the invoice has been populated with line items.
   */
  sendEmail?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const token = await provider.authorize();
  if (!token) {
    return {
      message: "Authentication required. Please authenticate with FreeAgent first.",
    };
  }

  // Try to find the client
  try {
    const contacts = await fetchContacts(token);
    const matchingContact = contacts.find(
      (contact) =>
        contact.organisation_name?.toLowerCase().includes(input.clientName.toLowerCase()) ||
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(input.clientName.toLowerCase()),
    );

    const clientDisplay = matchingContact
      ? matchingContact.organisation_name || `${matchingContact.first_name} ${matchingContact.last_name}`
      : input.clientName;

    return {
      message: `Are you sure you want to create an invoice for ${clientDisplay}?`,
      info: [
        { name: "Client", value: clientDisplay },
        { name: "Details", value: input.invoiceDetails },
        { name: "Payment Terms", value: `${input.paymentTerms || 30} days` },
        { name: "Reference", value: input.reference || "Auto-generated" },
        { name: "Send Email", value: input.sendEmail === true ? "Yes" : "No (invoice has no line items)" },
      ],
    };
  } catch {
    return {
      message: `Create invoice for ${input.clientName}?`,
      info: [
        { name: "Details", value: input.invoiceDetails },
        { name: "Note", value: "Client verification failed - will attempt to match during creation" },
      ],
    };
  }
};

/**
 * Create an invoice using natural language input for client name, services, and amount
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    // Fetch contacts to find matching client
    const contacts = await fetchContacts(token);

    if (contacts.length === 0) {
      return "❌ No contacts found in your FreeAgent account. Please add some contacts first before creating invoices.";
    }

    // Find matching contact by name
    const matchingContacts = contacts.filter((contact) => {
      const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
      const orgName = contact.organisation_name || "";
      const searchName = input.clientName.toLowerCase();

      return (
        orgName.toLowerCase().includes(searchName) ||
        fullName.toLowerCase().includes(searchName) ||
        searchName.includes(orgName.toLowerCase()) ||
        searchName.includes(fullName.toLowerCase())
      );
    });

    if (matchingContacts.length === 0) {
      return `❌ No contact found matching "${input.clientName}". Available contacts:\n${contacts
        .slice(0, 10)
        .map((c) => `• ${c.organisation_name || `${c.first_name} ${c.last_name}`}`)
        .join("\n")}${contacts.length > 10 ? `\n... and ${contacts.length - 10} more` : ""}`;
    }

    if (matchingContacts.length > 1) {
      return `🤔 Multiple contacts found matching "${input.clientName}":\n${matchingContacts
        .map((c, i) => `${i + 1}. ${c.organisation_name || `${c.first_name} ${c.last_name}`}`)
        .join("\n")}\n\nPlease be more specific with the client name.`;
    }

    const selectedContact = matchingContacts[0];

    // Prepare invoice data
    const invoiceData: InvoiceCreateData = {
      contact: selectedContact.url,
      dated_on: new Date().toISOString().split("T")[0], // Today's date
      payment_terms_in_days: input.paymentTerms || 30,
      send_new_invoice_emails: input.sendEmail === true, // Default to false — invoice has no line items yet
      reference: input.reference,
    };

    // Create the invoice
    const newInvoice = await createInvoice(token, invoiceData);

    const clientName =
      selectedContact.organisation_name || `${selectedContact.first_name} ${selectedContact.last_name}`;

    let result = `✅ **Invoice Created Successfully!**\n\n`;
    result += `📄 **Invoice #${newInvoice.reference}**\n`;
    result += `👤 **Client**: ${clientName}\n`;
    result += `📅 **Date**: ${new Date(newInvoice.dated_on).toLocaleDateString()}\n`;
    result += `💰 **Amount**: This will need to be added manually as line items\n`;
    result += `⏰ **Due**: ${new Date(newInvoice.due_on).toLocaleDateString()}\n`;
    result += `📧 **Email Notification**: ${newInvoice.send_new_invoice_emails ? "Enabled" : "Disabled"}\n\n`;

    result += `📝 **Next Steps**:\n`;
    result += `1. Open the invoice in FreeAgent to add line items\n`;
    result += `2. Add your services/products: "${input.invoiceDetails}"\n`;
    result += `3. Set the appropriate amounts and tax rates\n`;
    result += `4. Send the invoice to your client\n\n`;

    result += `🔗 **Invoice URL**: ${newInvoice.url}`;

    return result;
  } catch (error) {
    console.error("Invoice creation error:", error);
    return `❌ Unable to create invoice. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
