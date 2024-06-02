import { fetchPaymentLinkDetailsController } from "./controllers";

export async function fetchTransactionDetails(transactionType: string, transactionRef: string) {
  if (transactionType === "payment-link") {
    return await fetchPaymentLinkDetailsController(transactionRef);
  }
}
