import { withAccessToken } from "@raycast/utils";
import { authorize } from "../lib/auth";
import { appUrl } from "../lib/config";
import { type ProductSort, listProducts } from "../lib/twelfth";

type Input = {
  /**
   * Text to match against product name, SKU, brand or supplier. Leave empty to rank the whole range.
   */
  query?: string;
  /**
   * How to rank: "findings" (most open findings), "cover" (lowest days of cover), "velocity" (fastest selling),
   * "days_since_sold" (longest since sold), "gp_pct" (lowest GP%) or "name".
   */
  sort?: ProductSort;
  /**
   * How many products to return, 1 to 50. Defaults to 15.
   */
  limit?: number;
};

async function tool(input: Input) {
  const limit = Math.min(Math.max(Math.round(input.limit ?? 15), 1), 50);
  const page = await listProducts({
    query: input.query,
    sort: input.sort ?? (input.query ? "name" : "findings"),
    limit,
  });
  return {
    totalMatching: page.totalMatching,
    products: page.products.map((product) => ({
      sku: product.sku,
      name: product.name,
      category: product.category.label,
      supplier: product.supplier,
      openFindings: product.openFindings,
      ...product.position,
      url: product.url ?? appUrl(product.path),
    })),
  };
}

export default withAccessToken({ authorize })(tool);
