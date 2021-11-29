import { Search } from "./search";
import { render } from "@raycast/api";
import { Product } from "./lib/http";
import { SearchType } from "./lib/api";

render(<Search product={Product.WIKI} searchType={[SearchType.SPACE]} />);
