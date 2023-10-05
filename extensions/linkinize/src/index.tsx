import { Search } from "./SearchComponent";
import { hasToken } from "./support";
import { AuthScreen } from "./AuthComponent";

export default function Command() {
  const isLoggedIn = hasToken();
  return isLoggedIn ? Search() : AuthScreen();
}
