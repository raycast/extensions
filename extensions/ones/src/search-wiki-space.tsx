import { Search } from "./search";
import { Product } from "./lib/client";
import { SearchType } from "./lib/api";

export default function Command() {
  return <Search product={Product.WIKI} searchType={[SearchType.SPACE]} />;
}
