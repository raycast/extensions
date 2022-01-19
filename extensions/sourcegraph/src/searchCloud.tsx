import SearchCommand from "./components/search";
import { sourcegraphCloud } from "./sourcegraph";

export default function SearchCloud() {
  const src = sourcegraphCloud();
  return SearchCommand(src);
}
