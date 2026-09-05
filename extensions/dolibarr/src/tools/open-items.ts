import { fetchAllOrders, fetchAllProposals, fetchUnpaidInvoices } from "../api/documents";
import { buildOpenItems, type OpenItems } from "./openItems";
import { getToolContext } from "./toolContext";

export default async function tool(): Promise<OpenItems> {
  const { client, index, web } = await getToolContext();

  const [invoices, proposals, orders] = await Promise.all([
    fetchUnpaidInvoices(client),
    fetchAllProposals(client),
    fetchAllOrders(client),
  ]);

  return buildOpenItems({ invoices, proposals, orders, companies: index.thirdparties, web });
}
