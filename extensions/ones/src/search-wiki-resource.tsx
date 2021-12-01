import { Search } from "./search";
import { render } from "@raycast/api";
import { Product } from "./lib/client";
import { SearchType } from "./lib/api";

render(<Search product={Product.WIKI} searchType={[SearchType.RESOURCE]} />);
