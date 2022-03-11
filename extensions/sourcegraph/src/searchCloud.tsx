import SearchCommand from "./components/search";
import { sourcegraphCloud } from "./sourcegraph";

export default function SearchCloud() {
  return SearchCommand(sourcegraphCloud());
}
