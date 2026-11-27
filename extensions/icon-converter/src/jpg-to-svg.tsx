import { ConvertCommand } from "./lib/command";
import { fromJpg } from "./lib/formats/jpg";
import { toSvg } from "./lib/formats/trace";

export default function Command() {
  return <ConvertCommand from={fromJpg} to={toSvg} />;
}
