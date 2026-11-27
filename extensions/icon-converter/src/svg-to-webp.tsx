import { ConvertCommand } from "./lib/command";
import { fromSvg } from "./lib/formats/svg";
import { toWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromSvg} to={toWebp} />;
}
