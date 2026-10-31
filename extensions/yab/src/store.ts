import { attempt } from "./components";
import { openURL } from "./yab";

export default async function Command() {
  await attempt("Couldn't open it", () => openURL("https://yetanotherbrowser.com/store"));
}
