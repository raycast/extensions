import { ItemGrid } from "./components/ItemGrid";
import { ItemList } from "./components/ItemList";
import { ListContextProvider } from "./context/ListContext";
import { viewType } from "./lib/preferences";

export default function Command() {
  return <ListContextProvider>{viewType === "list" ? <ItemList /> : <ItemGrid />}</ListContextProvider>;
}
