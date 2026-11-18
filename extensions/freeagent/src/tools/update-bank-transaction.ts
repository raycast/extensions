import { Tool } from "@raycast/api";
import { updateBankTransaction, FreeAgentError } from "../services/freeagent";
import { provider } from "../oauth";

type Input = {
  /**
   * The URL of the bank transaction to update
   */
  transactionUrl: string;
  /**
   * Set to false to clear the marked_for_review flag, or true to mark for review
   */
  markedForReview?: boolean;
  /**
   * Optional: Update the transaction description
   */
  description?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info: { name: string; value: string }[] = [{ name: "Transaction URL", value: input.transactionUrl }];
  if (input.markedForReview !== undefined) {
    info.push({ name: "Marked for Review", value: input.markedForReview ? "Yes" : "No (clear flag)" });
  }
  if (input.description !== undefined) {
    info.push({ name: "Description", value: input.description });
  }
  return { message: "Update this bank transaction?", info };
};

/**
 * Update bank transaction properties, particularly to clear marked_for_review status.
 */
export default async function tool(input: Input) {
  const { transactionUrl, markedForReview, description } = input;

  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ **Authentication required**\n\nPlease authenticate with FreeAgent first.";
    }

    const urlMatch = transactionUrl.match(/\/bank_transactions\/(\d+)/);
    if (!urlMatch) {
      return "❌ **Invalid transaction URL**\n\nPlease provide a valid bank transaction URL (e.g., https://api.freeagent.com/v2/bank_transactions/123)";
    }

    const transactionId = urlMatch[1];

    const updateData: { marked_for_review?: boolean; description?: string } = {};
    if (markedForReview !== undefined) {
      updateData.marked_for_review = markedForReview;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    if (Object.keys(updateData).length === 0) {
      return "❌ **No updates specified**\n\nPlease specify either markedForReview status or description to update.";
    }

    const updatedTransaction = await updateBankTransaction(token, transactionId, updateData);

    let result = "✅ **Bank transaction updated successfully!**\n\n";
    result += `🏦 **Transaction**: ${transactionUrl}\n`;
    result += `💰 **Amount**: ${updatedTransaction.amount}\n`;
    result += `📅 **Date**: ${updatedTransaction.dated_on}\n`;
    result += `📝 **Description**: ${updatedTransaction.description}\n`;

    if (markedForReview !== undefined) {
      const status = markedForReview ? "⚠️ Marked for review" : "✅ Cleared for review";
      result += `🏷️ **Review Status**: ${status}\n`;
    }

    result += "\n";

    if (markedForReview === false) {
      result +=
        "🎉 **Transaction cleared from review!** The transaction is no longer marked for review and should appear as properly explained.\n";
    } else if (markedForReview === true) {
      result +=
        "⚠️ **Transaction marked for review.** This transaction will need attention and appears in the marked_for_review list.\n";
    }

    return result;
  } catch (error) {
    console.error("Error updating bank transaction:", error);

    if (error instanceof FreeAgentError) {
      if (error.status === 404) {
        return "❌ **Transaction not found**\n\nThe specified bank transaction could not be found. Please check the URL is correct.";
      }
      if (error.status === 422) {
        return "❌ **Update not allowed**\n\nThis transaction cannot be updated. It may be locked or in a state that doesn't allow modifications.";
      }
      if (error.status === 403) {
        return "❌ **Permission denied**\n\nYou don't have permission to update this transaction.";
      }
    }

    return `❌ **Update failed**\n\nCould not update the bank transaction. ${error instanceof Error ? error.message : String(error)}`;
  }
}
