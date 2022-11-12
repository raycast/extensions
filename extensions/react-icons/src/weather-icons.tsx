import * as Icons from "react-icons/wi";
import { GridComponent } from "./components/Grid";

export default function Command() {
  return (
    <GridComponent path="WeatherIcons" icons={Icons} />
  );
}
