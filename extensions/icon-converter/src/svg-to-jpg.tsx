import { ConvertCommand } from "./lib/command";
import { toJpg } from "./lib/formats/jpg";
import { fromSvg } from "./lib/formats/svg";

export default function Command() {
  return <ConvertCommand from={fromSvg} to={toJpg} />;
}
