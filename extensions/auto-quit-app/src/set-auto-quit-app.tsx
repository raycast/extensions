import { layout } from "./types/preferences";
import { AutoQuitAppListLayout } from "./components/auto-quit-app-list-layout";
import { AutoQuitAppGridLayout } from "./components/auto-quit-app-grid-layout";

export default function SetAutoQuitApp() {
  return layout === "List" ? <AutoQuitAppListLayout /> : <AutoQuitAppGridLayout />;
}
