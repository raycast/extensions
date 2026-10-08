import { fetchBankTransactions, fetchBankAccounts, fetchInvoices } from "../services/freeagent";
import { formatCurrencyAmount, formatDate } from "../utils/formatting";
import { provider } from "../oauth";
import { BankTransaction, Invoice } from "../types";

type Input = {
  /**
   * File information - name, size, or description of the selected file
   */
  fileName?: string;
  /**
   * Amount mentioned in the file (extracted from invoice, receipt, etc.)
   */
  fileAmount?: number;
  /**
   * Date from the file (invoice date, receipt date, etc.)
   */
  fileDate?: string;
  /**
   * Description or reference from the file
   */
  fileDescription?: string;
  /**
   * Type of file (invoice, receipt, contract, etc.)
   */
  fileType?: "invoice" | "receipt" | "contract" | "statement" | "other";
  /**
   * Whether to confirm before making changes
   */
  confirmBeforeAction?: boolean;
  /**
   * Search tolerance in days for date matching
   */
  dateTolerance?: number;
  /**
   * Search tolerance percentage for amount matching
   */
  amountTolerance?: number;
};

/**
 * Match files (invoices, receipts, etc.) to bank transactions using date, amount, and description, then attach and explain the transaction
 */
export default async function tool(input: Input = {}) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    if (!input.fileName && !input.fileAmount && !input.fileDate && !input.fileDescription) {
      return `📁 **File to Transaction Matcher**\n\nTo match a file to a transaction, please provide:\n• File name or description\n• Amount from the file (if available)\n• Date from the file (if available)\n• Any reference numbers or descriptions\n\nExample: "@freeagent match file 'Invoice_ABC_500.pdf' with amount £500 dated 2024-01-15"`;
    }

    // Get bank accounts first
    const bankAccounts = await fetchBankAccounts(token);

    if (bankAccounts.length === 0) {
      return "📊 No bank accounts found in your FreeAgent account.";
    }

    let allTransactions: (BankTransaction & { account_name: string })[] = [];

    // Fetch recent transactions from all accounts (both explained and unexplained)
    const searchDays = 90; // Look back 90 days for matches
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - searchDays);
    const fromDateStr = fromDate.toISOString().split("T")[0];

    for (const account of bankAccounts) {
      try {
        const transactions = await fetchBankTransactions(token, account.url, "all", fromDateStr);
        allTransactions = allTransactions.concat(transactions.map((t) => ({ ...t, account_name: account.name })));
      } catch (error) {
        console.warn(`Failed to fetch transactions for ${account.name}:`, error);
      }
    }

    if (allTransactions.length === 0) {
      return "📊 No recent transactions found to match against.";
    }

    const currency = bankAccounts[0]?.currency || "GBP";
    let analysis = `📎 **File to Transaction Matching**\n\n`;

    // Display file information
    analysis += `📁 **File Information**\n`;
    if (input.fileName) {
      analysis += `• File: ${input.fileName}\n`;
    }
    if (input.fileType) {
      analysis += `• Type: ${input.fileType}\n`;
    }
    if (input.fileAmount) {
      analysis += `• Amount: ${formatCurrencyAmount(currency, input.fileAmount)}\n`;
    }
    if (input.fileDate) {
      analysis += `• Date: ${formatDate(input.fileDate)}\n`;
    }
    if (input.fileDescription) {
      analysis += `• Description: ${input.fileDescription}\n`;
    }
    analysis += `\n`;

    // Find matching transactions
    const matches = findMatchingTransactions(allTransactions, input);

    if (matches.length === 0) {
      analysis += `❌ **No Matching Transactions Found**\n\n`;
      analysis += `Could not find any transactions that match the file criteria.\n\n`;
      analysis += `💡 **Suggestions**:\n`;
      analysis += `• Check if the transaction date is within the last ${searchDays} days\n`;
      analysis += `• Verify the amount matches a recent transaction\n`;
      analysis += `• The transaction might already be processed or in a different account\n`;

      // Show recent transactions for reference
      const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.dated_on).getTime() - new Date(a.dated_on).getTime())
        .slice(0, 5);

      if (recentTransactions.length > 0) {
        analysis += `\n📋 **Recent Transactions for Reference**:\n`;
        recentTransactions.forEach((transaction) => {
          const amount = parseFloat(transaction.amount);
          const amountStr = formatCurrencyAmount(currency, Math.abs(amount));
          const direction = amount > 0 ? "💰" : "💸";

          analysis += `• ${direction} ${amountStr} - ${transaction.description} (${formatDate(transaction.dated_on)})\n`;
        });
      }

      return analysis;
    }

    // Sort matches by confidence score
    matches.sort((a, b) => b.confidence - a.confidence);

    analysis += `✅ **Found ${matches.length} Potential Match(es)**\n\n`;

    // Show top matches
    const topMatches = matches.slice(0, 3);

    for (let i = 0; i < topMatches.length; i++) {
      const match = topMatches[i];
      const amount = parseFloat(match.amount);
      const amountStr = formatCurrencyAmount(currency, Math.abs(amount));
      const direction = amount > 0 ? "💰 Income" : "💸 Expense";

      analysis += `${i + 1}. **${direction}: ${amountStr}** (${match.confidence}% confidence)\n`;
      analysis += `   📅 Date: ${formatDate(match.dated_on)}\n`;
      analysis += `   📝 Description: "${match.description}"\n`;
      analysis += `   🏦 Account: ${match.account_name}\n`;

      // Show match reasons
      analysis += `   🎯 **Match Reasons**:\n`;
      match.reasons.forEach((reason) => {
        analysis += `      • ${reason}\n`;
      });

      // Check if transaction is already explained
      const isUnexplained = match.unexplained_amount && parseFloat(match.unexplained_amount) !== 0;
      if (isUnexplained) {
        analysis += `   ⚠️ Status: Unexplained transaction needing attention\n`;
      } else {
        analysis += `   ✅ Status: Already explained\n`;
      }

      analysis += `\n`;
    }

    if (matches.length > 3) {
      analysis += `... and ${matches.length - 3} more potential matches\n\n`;
    }

    // Generate explanation for the best match
    const bestMatch = matches[0];

    analysis += `💡 **Suggested Explanation for Best Match**\n`;
    const explanation = generateFileBasedExplanation(input, bestMatch);
    analysis += `"${explanation}"\n\n`;

    // Action recommendations
    analysis += `🎯 **Recommended Actions**\n`;

    if (input.confirmBeforeAction !== false) {
      analysis += `⚠️ **Confirmation Required** - The following actions are recommended:\n\n`;
    }

    const isUnexplained = bestMatch.unexplained_amount && parseFloat(bestMatch.unexplained_amount) !== 0;

    if (isUnexplained) {
      analysis += `1. **Explain Transaction**: Add explanation to link this transaction with the file\n`;
      analysis += `2. **Upload File**: Attach ${input.fileName || "the file"} to the transaction\n`;
      analysis += `3. **Categorize**: Set appropriate category based on file type\n`;
    } else {
      analysis += `1. **Update Explanation**: Add file reference to existing explanation\n`;
      analysis += `2. **Upload File**: Attach ${input.fileName || "the file"} as additional documentation\n`;
    }

    if (input.fileType === "invoice") {
      // Try to match with FreeAgent invoices
      try {
        const invoices = await fetchInvoices(token);
        const matchingInvoice = findMatchingInvoice(invoices, input, bestMatch);

        if (matchingInvoice) {
          analysis += `4. **Link Invoice**: This appears to match FreeAgent invoice #${matchingInvoice.reference || "N/A"}\n`;
        } else {
          analysis += `4. **Check Invoices**: Verify if this corresponds to a FreeAgent invoice\n`;
        }
      } catch (error) {
        console.warn("Failed to fetch invoices for matching:", error);
      }
    }

    analysis += `\n💡 **File Processing Tips**\n`;
    analysis += `• Ensure file names include key details (amount, date, client)\n`;
    analysis += `• Use consistent naming conventions for easier matching\n`;
    analysis += `• Keep digital copies organized by month or client\n`;

    if (input.fileType === "receipt") {
      analysis += `• For receipts: Include VAT details and business purpose in explanation\n`;
    } else if (input.fileType === "invoice") {
      analysis += `• For invoices: Verify payment matches invoice amount and client\n`;
    }

    // Note about actual file operations
    analysis += `\n📝 **Note**: This tool provides matching analysis and suggestions. Actual file upload and transaction explanation updates would require additional FreeAgent API permissions and should be confirmed before execution.`;

    return analysis;
  } catch (error) {
    console.error("File matching error:", error);
    return `❌ Unable to match file to transactions. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function findMatchingTransactions(
  transactions: (BankTransaction & { account_name: string })[],
  input: Input,
): (BankTransaction & { account_name: string; confidence: number; reasons: string[] })[] {
  const matches: (BankTransaction & { account_name: string; confidence: number; reasons: string[] })[] = [];
  const dateTolerance = input.dateTolerance || 7; // days
  const amountTolerance = input.amountTolerance || 5; // percentage

  // Threshold scales with the inputs supplied so callers passing only
  // description/file-type can still surface matches. Each signal contributes
  // its own maximum: amount 40, date 30, description 20, file-type 10.
  let maxConfidence = 0;
  if (input.fileAmount) maxConfidence += 40;
  if (input.fileDate) maxConfidence += 30;
  if (input.fileDescription || input.fileName) maxConfidence += 20;
  if (input.fileType) maxConfidence += 10;
  const threshold = maxConfidence * 0.3;

  for (const transaction of transactions) {
    const confidence = calculateMatchConfidence(transaction, input, dateTolerance, amountTolerance);

    if (confidence > threshold) {
      const reasons = getMatchReasons(transaction, input, dateTolerance, amountTolerance);
      matches.push({
        ...transaction,
        confidence: Math.round(confidence),
        reasons,
      });
    }
  }

  return matches;
}

function calculateMatchConfidence(
  transaction: BankTransaction & { account_name: string },
  input: Input,
  dateTolerance: number,
  amountTolerance: number,
): number {
  let confidence = 0;
  const maxConfidence = 100;

  // Amount matching (40% weight)
  if (input.fileAmount) {
    const transactionAmount = Math.abs(parseFloat(transaction.amount));
    const fileAmount = Math.abs(input.fileAmount);

    if (fileAmount > 0) {
      const amountDiff = Math.abs(transactionAmount - fileAmount) / fileAmount;

      if (amountDiff <= amountTolerance / 100) {
        confidence += 40 * (1 - amountDiff * (100 / amountTolerance));
      }
    }
  }

  // Date matching (30% weight)
  if (input.fileDate) {
    const transactionDate = new Date(transaction.dated_on);
    const fileDate = new Date(input.fileDate);
    const daysDiff = Math.abs((transactionDate.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= dateTolerance) {
      confidence += 30 * (1 - daysDiff / dateTolerance);
    }
  }

  // Description/reference matching (20% weight)
  if (input.fileDescription || input.fileName) {
    const searchTerms = [
      input.fileDescription,
      input.fileName,
      input.fileName?.replace(/\.[^.]+$/, ""), // filename without extension
    ]
      .filter(Boolean)
      .map((term) => term!.toLowerCase());

    const transactionDesc = transaction.description.toLowerCase();
    let descriptionMatch = 0;

    for (const term of searchTerms) {
      if (transactionDesc.includes(term)) {
        descriptionMatch = Math.max(descriptionMatch, 0.8);
      } else {
        // Check for partial word matches
        const words = term.split(/[\s\-_]+/);
        const matchingWords = words.filter((word) => word.length > 2 && transactionDesc.includes(word));
        if (matchingWords.length > 0) {
          descriptionMatch = Math.max(descriptionMatch, 0.4 * (matchingWords.length / words.length));
        }
      }
    }

    confidence += 20 * descriptionMatch;
  }

  // File type relevance (10% weight)
  if (input.fileType) {
    const amount = parseFloat(transaction.amount);
    if (input.fileType === "invoice" && amount > 0) {
      confidence += 10; // Income transaction matches invoice
    } else if (input.fileType === "receipt" && amount < 0) {
      confidence += 10; // Expense transaction matches receipt
    } else if (input.fileType === "statement" || input.fileType === "other") {
      confidence += 5; // Neutral file types
    }
  }

  return Math.min(confidence, maxConfidence);
}

function getMatchReasons(
  transaction: BankTransaction & { account_name: string },
  input: Input,
  dateTolerance: number,
  amountTolerance: number,
): string[] {
  const reasons: string[] = [];

  // Amount matching
  if (input.fileAmount) {
    const transactionAmount = Math.abs(parseFloat(transaction.amount));
    const fileAmount = Math.abs(input.fileAmount);

    if (fileAmount > 0) {
      const amountDiff = Math.abs(transactionAmount - fileAmount) / fileAmount;

      if (amountDiff <= amountTolerance / 100) {
        if (amountDiff < 0.01) {
          reasons.push("Exact amount match");
        } else {
          reasons.push(`Amount match within ${Math.round(amountDiff * 100)}% tolerance`);
        }
      }
    }
  }

  // Date matching
  if (input.fileDate) {
    const transactionDate = new Date(transaction.dated_on);
    const fileDate = new Date(input.fileDate);
    const daysDiff = Math.abs((transactionDate.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= dateTolerance) {
      if (daysDiff < 1) {
        reasons.push("Same date");
      } else {
        reasons.push(`Date within ${Math.round(daysDiff)} day(s)`);
      }
    }
  }

  // Description matching
  if (input.fileDescription || input.fileName) {
    const searchTerms = [input.fileDescription, input.fileName].filter(Boolean);
    const transactionDesc = transaction.description.toLowerCase();

    for (const term of searchTerms) {
      if (term && transactionDesc.includes(term.toLowerCase())) {
        reasons.push(`Description contains "${term}"`);
      }
    }
  }

  // Type relevance
  if (input.fileType) {
    const amount = parseFloat(transaction.amount);
    if (input.fileType === "invoice" && amount > 0) {
      reasons.push("Income transaction matches invoice file");
    } else if (input.fileType === "receipt" && amount < 0) {
      reasons.push("Expense transaction matches receipt file");
    }
  }

  return reasons;
}

function generateFileBasedExplanation(input: Input, transaction: BankTransaction & { account_name: string }): string {
  const amount = parseFloat(transaction.amount);
  const isIncome = amount > 0;

  let explanation = "";

  if (input.fileType === "invoice" && isIncome) {
    explanation = `Payment received for invoice ${input.fileName || input.fileDescription || "attached"}`;
    if (input.fileDescription) {
      explanation += ` - ${input.fileDescription}`;
    }
  } else if (input.fileType === "receipt" && !isIncome) {
    explanation = `Business expense with receipt ${input.fileName || "attached"}`;
    if (input.fileDescription) {
      explanation += ` - ${input.fileDescription}`;
    }
  } else if (input.fileType === "contract") {
    explanation = `Transaction related to contract ${input.fileName || input.fileDescription || "attached"}`;
  } else if (input.fileType === "statement") {
    explanation = `Transaction documented in statement ${input.fileName || "attached"}`;
  } else {
    // Generic explanation
    if (isIncome) {
      explanation = `Income transaction with supporting document ${input.fileName || "attached"}`;
    } else {
      explanation = `Business expense with supporting document ${input.fileName || "attached"}`;
    }

    if (input.fileDescription) {
      explanation += ` - ${input.fileDescription}`;
    }
  }

  return explanation;
}

function findMatchingInvoice(
  invoices: Invoice[],
  input: Input,
  transaction: BankTransaction & { account_name: string },
): Invoice | null {
  if (!input.fileAmount && !input.fileDate) {
    return null;
  }

  const transactionAmount = Math.abs(parseFloat(transaction.amount));

  for (const invoice of invoices) {
    // Each provided criterion must individually pass. A missing criterion is not
    // considered — the early-return above guarantees at least one was supplied.
    let amountOk: boolean | null = null;
    let dateOk: boolean | null = null;

    if (input.fileAmount) {
      const invoiceAmount = parseFloat(invoice.net_value || invoice.total_value || "0");
      if (invoiceAmount > 0) {
        const amountDiff = Math.abs(transactionAmount - invoiceAmount) / invoiceAmount;
        amountOk = amountDiff < 0.05; // 5% tolerance
      } else {
        amountOk = false;
      }
    }

    if (input.fileDate) {
      const invoiceDate = new Date(invoice.dated_on);
      const fileDate = new Date(input.fileDate);
      const daysDiff = Math.abs((invoiceDate.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24));
      dateOk = daysDiff <= 30; // Within 30 days
    }

    const allProvidedPass = (amountOk === null || amountOk) && (dateOk === null || dateOk);
    const anyProvided = amountOk !== null || dateOk !== null;
    if (anyProvided && allProvidedPass) {
      return invoice;
    }
  }

  return null;
}
