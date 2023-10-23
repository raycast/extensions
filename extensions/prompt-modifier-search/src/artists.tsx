import artists from "../assets/categories/artists.json";
import { GridView } from "./components/GridView";

export default function Command() {
  return <GridView items={artists} category="artists" />;
}
