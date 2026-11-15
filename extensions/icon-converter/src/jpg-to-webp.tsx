import { ConvertCommand } from "./lib/command";
import { fromJpg } from "./lib/formats/jpg";
import { toWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromJpg} to={toWebp} />;
}
