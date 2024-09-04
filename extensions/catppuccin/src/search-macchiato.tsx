import { flavors } from "@catppuccin/palette";
import ColorGrid from "./components/ColorGrid";

export default function SearchMacchiato() {
  return <ColorGrid flavorColors={flavors.macchiato.colors} />;
}
