import { ConvertCommand } from "./lib/command";
import { fromJpg } from "./lib/formats/jpg";
import { toPng } from "./lib/formats/png";

export default function Command() {
  return <ConvertCommand from={fromJpg} to={toPng} />;
}
