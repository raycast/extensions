const E_INVOICE_DIRECTORY_URL = "https://verkkolaskuosoite.fi/client/#/";

export function buildEInvoiceDirectoryUrl(businessId: string): string {
  return `${E_INVOICE_DIRECTORY_URL}?searchText=${encodeURIComponent(businessId.trim())}`;
}
