import terms from "../assets/categories/terms.json";
import { GridView } from "./components/GridView";

export default function Command() {
  return (
    <GridView items={terms} category="terms" />
  );
}
