import { ConvertCommand } from "./lib/command";
import { toPng } from "./lib/formats/png";
import { fromSvg } from "./lib/formats/svg";

export default function Command() {
  return <ConvertCommand from={fromSvg} to={toPng} />;
}
