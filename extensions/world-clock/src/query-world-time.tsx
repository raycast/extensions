import { itemLayout } from "./types/preferences";
import { QueryWorldListLayout } from "./components/query-world-list-layout";
import { QueryWorldGridLayout } from "./components/query-world-grid-layout";

export default function QueryWorldTime() {
  return itemLayout === "List" ? <QueryWorldListLayout /> : <QueryWorldGridLayout />;
}
