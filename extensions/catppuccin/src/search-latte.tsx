import { flavors } from "@catppuccin/palette";
import ColorGrid from "./components/ColorGrid";

export default function SearchLatte() {
  return <ColorGrid flavorColors={flavors.latte.colors} />;
}
