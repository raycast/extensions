import { List } from "@raycast/api";
import { Pricing, Term } from "../types";

export default function PriceListItem({price}: { price: Pricing }) {
    function getTermChar(term: Term) {
        switch (term) {
          case 1: return "m";
          case 2: return "?";
          case 3: return "?";
          case 4: return "y";
          case 5: return "?";
          case 6: return "?";
        }
      }

    return <List.Item.Detail.Metadata.Label title="Price" text={`${price.price} ${price.currency} p/${getTermChar(price.term)}`} />
}