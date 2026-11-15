import { ConvertCommand } from "./lib/command";
import { toJpg } from "./lib/formats/jpg";
import { fromWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromWebp} to={toJpg} />;
}
