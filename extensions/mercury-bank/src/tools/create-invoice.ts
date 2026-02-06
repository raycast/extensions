import { getApiClient } from "../lib/accounts";
import { formatCurrency } from "../lib/utils";

type Input = {
  customerId: string;
  destinationAccountId: string;
  dueDate: string;
  invoiceDate: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  invoiceNumber?: string;
};

export default async function CreateInvoiceTool(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };

  try {
    const invoice = await api.createInvoice({
      customerId: input.customerId,
      destinationAccountId: input.destinationAccountId,
      dueDate: input.dueDate,
      invoiceDate: input.invoiceDate,
      lineItems: input.lineItems,
      creditCardEnabled: false,
      achDebitEnabled: true,
      useRealAccountNumber: false,
      ccEmails: [],
      invoiceNumber: input.invoiceNumber,
    });

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(invoice.amount),
      status: invoice.status,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}

export const confirmation = {
  message: (input: Input) => {
    const total = input.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    return `Create invoice for ${formatCurrency(total)} with ${input.lineItems.length} line item(s)?`;
  },
};