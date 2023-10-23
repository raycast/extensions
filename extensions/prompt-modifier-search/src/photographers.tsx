import photographers from "../assets/categories/photographers.json";
import { GridView } from "./components/GridView";

export default function Command() {
  return <GridView items={photographers} category="photographers" />;
}
