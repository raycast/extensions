import { Tool } from "@raycast/api";
import { createBankTransactionExplanation } from "../services/freeagent";
import { provider } from "../oauth";
import { BankTransactionExplanationCreateData } from "../types";

type Input = {
  /**
   * The URL of the bank transaction to explain (from the list-unexplained-transactions tool)
   */
  bankTransactionUrl: string;
  /**
   * The URL of the bank account associated with the transaction (from the list-bank-accounts tool, or attached to the transaction object)
   */
  bankAccountUrl: string;
  /**
   * Description/explanation for the transaction
   */
  description: string;
  /**
   * The amount being explained (should match the transaction amount)
   */
  grossValue: string;
  /**
   * Date of the transaction (YYYY-MM-DD format)
   */
  datedOn: string;
  /**
   * Optional category URL (get from list-categories tool)
   */
  categoryUrl?: string;
  /**
   * Optional sales tax status ("TAXABLE", "EXEMPT", "OUT_OF_SCOPE")
   */
  salesTaxStatus?: string;
  /**
   * Optional sales tax rate (e.g., "20.0" for 20%)
   */
  salesTaxRate?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Add explanation to this bank transaction?",
  info: [
    { name: "Transaction URL", value: input.bankTransactionUrl },
    { name: "Bank Account URL", value: input.bankAccountUrl },
    { name: "Description", value: input.description },
    { name: "Gross Value", value: input.grossValue },
    { name: "Date", value: input.datedOn },
    ...(input.categoryUrl ? [{ name: "Category", value: input.categoryUrl }] : []),
    ...(input.salesTaxStatus ? [{ name: "Tax Status", value: input.salesTaxStatus }] : []),
    ...(input.salesTaxRate ? [{ name: "Tax Rate", value: `${input.salesTaxRate}%` }] : []),
  ],
});

/**
 * Add an explanation to a bank transaction in FreeAgent.
 *
 * ⚠️ IMPORTANT: This tool is for UNEXPLAINED transactions only!
 *
 * • For UNEXPLAINED transactions: Use this tool to create a new explanation
 * • For MARKED_FOR_REVIEW transactions: Use update-bank-transaction-explanation tool instead
 *
 * If you get a 422 error "This transaction has already been fully explained",
 * the transaction likely has an auto-generated explanation marked for review.
 * Use the update-bank-transaction-explanation tool in that case.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    // Validate required inputs
    if (!input.bankTransactionUrl) {
      return "❌ Bank transaction URL is required. Use the list-unexplained-transactions tool to get transaction URLs.";
    }

    if (!input.bankAccountUrl) {
      return "❌ Bank account URL is required. Get it from the transaction's `bank_account` field or from the list of bank accounts.";
    }

    if (!input.description) {
      return "❌ Description is required for the explanation.";
    }

    if (!input.grossValue) {
      return "❌ Gross value (amount) is required.";
    }

    if (!input.datedOn) {
      return "❌ Date is required in YYYY-MM-DD format.";
    }

    // Prepare explanation data
    const explanationData: BankTransactionExplanationCreateData = {
      bank_transaction: input.bankTransactionUrl,
      bank_account: input.bankAccountUrl,
      dated_on: input.datedOn,
      description: input.description,
      gross_value: input.grossValue,
    };

    // Add optional fields
    if (input.categoryUrl) {
      explanationData.category = input.categoryUrl;
    }

    if (input.salesTaxStatus) {
      explanationData.sales_tax_status = input.salesTaxStatus;
    }

    if (input.salesTaxRate) {
      explanationData.sales_tax_rate = input.salesTaxRate;
    }

    // Create the explanation
    const explanation = await createBankTransactionExplanation(token, explanationData);

    let result = `✅ **Bank Transaction Explanation Added Successfully!**\n\n`;
    result += `📝 **Description**: ${explanation.description}\n`;
    result += `💰 **Amount**: ${explanation.gross_value}\n`;
    result += `📅 **Date**: ${explanation.dated_on}\n`;

    if (explanation.category) {
      result += `📂 **Category**: ${explanation.category}\n`;
    }

    if (explanation.sales_tax_status) {
      result += `💸 **Tax Status**: ${explanation.sales_tax_status}\n`;
    }

    if (explanation.sales_tax_rate) {
      result += `📊 **Tax Rate**: ${explanation.sales_tax_rate}%\n`;
    }

    result += `\n🔗 **Explanation URL**: ${explanation.url}\n`;

    result += `\n💡 **Next Steps**:\n`;
    result += `• The transaction has been marked as explained in FreeAgent\n`;
    result += `• You can view and edit this explanation in your FreeAgent account\n`;
    result += `• Use the list-categories tool to find category URLs for future explanations\n`;
    result += `• To attach a receipt, upload it with upload-attachment then call update-bank-transaction-explanation with the resulting attachmentUrl\n`;

    return result;
  } catch (error) {
    console.error("Bank transaction explanation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("400")) {
        return `❌ Invalid request data. Please check that:\n• The transaction URL is correct\n• The amount matches the transaction\n• The date is in YYYY-MM-DD format\n• The transaction hasn't already been fully explained`;
      }
      if (error.message.includes("404")) {
        return `❌ Transaction not found. Please verify the transaction URL is correct.`;
      }
      if (error.message.includes("401") || error.message.includes("403")) {
        return `❌ Authentication failed. Please re-authenticate with FreeAgent.`;
      }
      if (error.message.includes("422") && error.message.includes("already been fully explained")) {
        return (
          `❌ **This transaction already has an explanation!**\n\n` +
          `This usually means the transaction is **marked for review** rather than unexplained.\n\n` +
          `✅ **Solution**: Use the **update-bank-transaction-explanation** tool instead:\n` +
          `• First, get the existing explanation URL from the transaction details\n` +
          `• Then use update-bank-transaction-explanation to modify the existing explanation\n` +
          `• This will also clear the "marked for review" status\n\n` +
          `📚 **Tool Usage**:\n` +
          `• **Unexplained transactions** → use add-bank-transaction-explanation (this tool)\n` +
          `• **Marked for review transactions** → use update-bank-transaction-explanation\n`
        );
      }
      if (error.message.includes("422")) {
        return `❌ Validation error. Please check that:\n• All required fields are provided\n• The amount format is correct (e.g., "100.00")\n• The date format is YYYY-MM-DD\n• The category URL is valid (if provided)`;
      }
    }

    return `❌ Unable to add explanation. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
