import { Search } from "./search";
import { render } from "@raycast/api";
import { SearchType } from "./lib/api";

render(<Search searchType={SearchType.IMAGE} />);
