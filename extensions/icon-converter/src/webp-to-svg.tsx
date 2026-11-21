import { ConvertCommand } from "./lib/command";
import { toSvg } from "./lib/formats/trace";
import { fromWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromWebp} to={toSvg} />;
}
