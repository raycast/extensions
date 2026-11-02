import { Cache, showHUD } from "@raycast/api";
import { resetLocalData } from "./services/keito/session";
import { refreshMenuBar, store } from "./services/useKeito";

// Clears cached Keito data and the verified identity. Favorites and preferences are kept;
// favorites are already stored separately for each company and identity.
export default async function main() {
  const removed = await resetLocalData(store);
  new Cache().clear();
  await refreshMenuBar();
  await showHUD(`Cleared ${removed} local Keito item(s); favorites kept`);
}
