import { Detail } from "@raycast/api";
import { ISaleResponse, Item } from "envato";

export default function PurchaseDetails(props: { data: ISaleResponse }) {
  function saleToMarkdown(sale: ISaleResponse): string {
    const itemMarkdown = itemToMarkdown(sale.item);

    return `## Sale Details
      - Amount: ${sale.amount}
      - Sold At: ${sale.sold_at}
      - License: ${sale.license}
      - Support Amount: ${sale.support_amount}
      - Supported Until: ${sale.supported_until}
      - Buyer: ${sale.buyer}
      - Purchase Count: ${sale.purchase_count}
   
      ${itemMarkdown}`;
  }

  function itemToMarkdown(item: Item): string {
    const { name, author_username, url, classification, price_cents, rating, rating_count, tags } = item;

    return `
        
        ## Item Details
        
      - Name: [${name}](${url})
      - Author: ${author_username}
      - Classification: ${classification}
      - Price: $${price_cents / 100}
      - Rating: ${rating} (${rating_count} ratings)
      - Tags: ${tags.join(", ")}`;
  }

  return <Detail markdown={saleToMarkdown(props.data)} />;
}
