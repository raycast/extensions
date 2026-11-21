import { ConvertCommand } from "./lib/command";
import { fromAvif } from "./lib/formats/avif";
import { toJpg } from "./lib/formats/jpg";

export default function Command() {
  return <ConvertCommand from={fromAvif} to={toJpg} />;
}
