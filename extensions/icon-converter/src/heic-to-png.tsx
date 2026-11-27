import { ConvertCommand } from "./lib/command";
import { fromHeic } from "./lib/formats/heic";
import { toPng } from "./lib/formats/png";

export default function Command() {
  return <ConvertCommand from={fromHeic} to={toPng} />;
}
