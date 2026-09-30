import { Tool } from "@raycast/api";
import { updateBankTransactionExplanation, getBankTransactionExplanation } from "../services/freeagent";
import { provider } from "../oauth";
import { BankTransactionExplanationUpdateData } from "../types";

type Input = {
  /**
   * The URL of the bank transaction explanation to update (from existing explanations)
   */
  explanationUrl: string;
  /**
   * Updated description/explanation for the transaction (optional)
   */
  description?: string;
  /**
   * Updated category URL (get from list-categories tool) (optional)
   */
  categoryUrl?: string;
  /**
   * Updated gross value/amount (optional)
   */
  grossValue?: string;
  /**
   * Updated project URL (optional)
   */
  projectUrl?: string;
  /**
   * Updated sales tax status ("TAXABLE", "EXEMPT", "OUT_OF_SCOPE") (optional)
   */
  salesTaxStatus?: string;
  /**
   * Updated sales tax rate (e.g., "20.0" for 20%) (optional)
   */
  salesTaxRate?: string;
  /**
   * URL of an uploaded attachment to associate with this explanation (use upload-attachment tool first) (optional)
   */
  attachmentUrl?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const changes: { name: string; value: string }[] = [{ name: "Explanation URL", value: input.explanationUrl }];
  if (input.description !== undefined) changes.push({ name: "Description", value: input.description });
  if (input.categoryUrl !== undefined) changes.push({ name: "Category", value: input.categoryUrl });
  if (input.grossValue !== undefined) changes.push({ name: "Gross Value", value: input.grossValue });
  if (input.projectUrl !== undefined) changes.push({ name: "Project", value: input.projectUrl });
  if (input.salesTaxStatus !== undefined) changes.push({ name: "Tax Status", value: input.salesTaxStatus });
  if (input.salesTaxRate !== undefined) changes.push({ name: "Tax Rate", value: `${input.salesTaxRate}%` });
  if (input.attachmentUrl !== undefined) changes.push({ name: "Attachment", value: input.attachmentUrl });
  return { message: "Update this bank transaction explanation?", info: changes };
};

/**
 * Update an existing bank transaction explanation in FreeAgent.
 * This is used for transactions that already have an explanation but need changes.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    // Validate required inputs
    if (!input.explanationUrl) {
      return "❌ Bank transaction explanation URL is required. You can get this from the bank transaction details or by listing explanations for the bank account.";
    }

    // Extract explanation ID from URL
    const urlParts = input.explanationUrl.split("/");
    const explanationId = urlParts[urlParts.length - 1];

    if (!explanationId || !explanationId.match(/^\d+$/)) {
      return "❌ Invalid explanation URL format or ID. Expected format: https://api.freeagent.com/v2/bank_transaction_explanations/{id}, where {id} is a numeric ID.";
    }

    // Check if any update fields are provided
    const hasUpdates =
      input.description !== undefined ||
      input.categoryUrl !== undefined ||
      input.grossValue !== undefined ||
      input.projectUrl !== undefined ||
      input.salesTaxStatus !== undefined ||
      input.salesTaxRate !== undefined ||
      input.attachmentUrl !== undefined;

    if (!hasUpdates) {
      return "❌ At least one field must be provided to update. Available fields: description, categoryUrl, grossValue, projectUrl, salesTaxStatus, salesTaxRate, attachmentUrl";
    }

    // Get current explanation to show before/after
    let currentExplanation;
    try {
      currentExplanation = await getBankTransactionExplanation(token, explanationId);
    } catch (error) {
      return `❌ Could not retrieve existing explanation. Please verify the explanation URL is correct and the explanation exists. Error: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Prepare update data
    const updateData: BankTransactionExplanationUpdateData = {};

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.categoryUrl !== undefined) {
      updateData.category = input.categoryUrl;
    }

    if (input.grossValue !== undefined) {
      updateData.gross_value = input.grossValue;
    }

    if (input.projectUrl !== undefined) {
      updateData.project = input.projectUrl;
    }

    if (input.salesTaxStatus !== undefined) {
      updateData.sales_tax_status = input.salesTaxStatus;
    }

    if (input.salesTaxRate !== undefined) {
      updateData.sales_tax_rate = input.salesTaxRate;
    }

    if (input.attachmentUrl !== undefined) {
      updateData.attachment = input.attachmentUrl;
    }

    // Update the explanation
    const updatedExplanation = await updateBankTransactionExplanation(token, explanationId, updateData);

    let result = `✅ **Bank Transaction Explanation Updated Successfully!**\n\n`;
    result += `🔗 **Explanation URL**: ${updatedExplanation.url || input.explanationUrl}\n\n`;

    result += `📝 **Changes Made**:\n`;

    if (input.description !== undefined) {
      result += `• **Description**: "${currentExplanation.description}" → "${updatedExplanation.description}"\n`;
    }

    if (input.grossValue !== undefined) {
      result += `• **Amount**: ${currentExplanation.gross_value} → ${updatedExplanation.gross_value}\n`;
    }

    if (input.categoryUrl !== undefined) {
      result += `• **Category**: Updated to ${updatedExplanation.category || "new category"}\n`;
    }

    if (input.salesTaxStatus !== undefined) {
      result += `• **Tax Status**: ${currentExplanation.sales_tax_status || "none"} → ${updatedExplanation.sales_tax_status}\n`;
    }

    if (input.salesTaxRate !== undefined) {
      result += `• **Tax Rate**: ${currentExplanation.sales_tax_rate || "0"}% → ${updatedExplanation.sales_tax_rate}%\n`;
    }

    if (input.attachmentUrl !== undefined) {
      result += `• **Attachment**: Added new attachment\n`;
    }

    result += `\n📅 **Date**: ${updatedExplanation.dated_on}\n`;
    result += `💰 **Final Amount**: ${updatedExplanation.gross_value}\n`;

    if (updatedExplanation.sales_tax_value) {
      result += `💸 **Tax Amount**: ${updatedExplanation.sales_tax_value}\n`;
    }

    result += `\n💡 **Next Steps**:\n`;
    result += `• The explanation has been updated, but the transaction is still flagged for review — call update-bank-transaction with markedForReview=false to clear that flag\n`;
    result += `• You can view the updated explanation in your FreeAgent account\n`;
    result += `• Use the upload-attachment tool to add receipts or supporting documents\n`;
    result += `• Use list-categories tool to find appropriate category URLs\n`;

    return result;
  } catch (error) {
    console.error("Bank transaction explanation update error:", error);

    if (error instanceof Error) {
      if (error.message.includes("400")) {
        return `❌ Invalid request data. Please check that:\n• The explanation URL is correct\n• The amount format is valid (e.g., "100.00")\n• The tax rate is a valid percentage (e.g., "20.0")\n• The sales tax status is one of: TAXABLE, EXEMPT, OUT_OF_SCOPE`;
      }
      if (error.message.includes("404")) {
        return `❌ Explanation not found. Please verify the explanation URL is correct and the explanation exists.`;
      }
      if (error.message.includes("401") || error.message.includes("403")) {
        return `❌ Authentication failed. Please re-authenticate with FreeAgent.`;
      }
      if (error.message.includes("422")) {
        return `❌ Validation error. This might occur if:\n• The explanation is already in a final state\n• The category URL is invalid\n• Required fields are missing\n• The attached file is not valid`;
      }
    }

    return `❌ Unable to update explanation. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
