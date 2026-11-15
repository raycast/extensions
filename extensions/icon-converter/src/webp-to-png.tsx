import { ConvertCommand } from "./lib/command";
import { toPng } from "./lib/formats/png";
import { fromWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromWebp} to={toPng} />;
}
