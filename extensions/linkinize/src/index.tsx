import { Search } from "./SearchComponent";
import { authenticationCheck } from "./support";

export default function Command() {
  authenticationCheck();
  return Search();
}
