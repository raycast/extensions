import { flavors } from "@catppuccin/palette";
import ColorGrid from "./components/ColorGrid";

export default function SearchMocha() {
  return <ColorGrid flavorColors={flavors.mocha.colors} />;
}
