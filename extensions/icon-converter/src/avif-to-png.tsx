import { ConvertCommand } from "./lib/command";
import { fromAvif } from "./lib/formats/avif";
import { toPng } from "./lib/formats/png";

export default function Command() {
  return <ConvertCommand from={fromAvif} to={toPng} />;
}
