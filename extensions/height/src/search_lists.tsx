import SearchLists from "./components/SearchLists";
import { withHeightAuth } from "./components/withHeightAuth";

export default function Command() {
  return withHeightAuth(<SearchLists />);
}
