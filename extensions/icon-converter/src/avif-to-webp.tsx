import { ConvertCommand } from "./lib/command";
import { fromAvif } from "./lib/formats/avif";
import { toWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromAvif} to={toWebp} />;
}
