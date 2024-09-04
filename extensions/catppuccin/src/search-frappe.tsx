import { flavors } from "@catppuccin/palette";
import ColorGrid from "./components/ColorGrid";

export default function SearchFrappe() {
  return <ColorGrid flavorColors={flavors.frappe.colors} />;
}
