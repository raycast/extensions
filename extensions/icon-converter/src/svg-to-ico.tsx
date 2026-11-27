import { ConvertCommand } from "./lib/command";
import { toIco } from "./lib/formats/ico";
import { fromSvg } from "./lib/formats/svg";

export default function Command() {
  return <ConvertCommand from={fromSvg} to={toIco} />;
}
