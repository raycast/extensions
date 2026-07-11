import { List } from "@raycast/api";
import { Pricing, Term } from "../types";

export default function PriceListItem({ price }: { price: Pricing }) {
  function getTermChar(term: Term) {
    switch (term) {
      case Term.Monthly:
        return "m";
      case Term.Quarterly:
        return "qtr";
      case Term["Half Annual"]:
        return "hy";
      case Term.Annual:
        return "y";
      case Term.Biennal:
        return "2y";
      case Term.Triennial:
        return "3y";
    }
  }

  return (
    <List.Item.Detail.Metadata.Label
      title="Price"
      text={`${price.price} ${price.currency} p/${getTermChar(price.term)}`}
    />
  );
}
