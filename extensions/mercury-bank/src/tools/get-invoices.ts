import { getApiClient } from "../lib/accounts";
import { formatCurrency } from "../lib/utils";

type Input = {
  status?: string;
};

export default async function GetInvoices(input: Input) {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const invoices = await api.getInvoices(input.status);
    return invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      status: i.status,
      amount: i.amount,
      formattedAmount: formatCurrency(i.amount),
      dueDate: i.dueDate,
      invoiceDate: i.invoiceDate,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}