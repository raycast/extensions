import { Cache } from "@raycast/api";
import { TOKEN } from "./constants";
import { Login } from "./LoginComponent";
import { Search } from "./SearchComponent";

const cache = new Cache();

export default function Command() {
  const isLoggedIn = cache.get(TOKEN);
  return isLoggedIn?.length ? Search(cache) : Login();
}
