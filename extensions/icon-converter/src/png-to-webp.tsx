import { ConvertCommand } from "./lib/command";
import { fromPng } from "./lib/formats/png";
import { toWebp } from "./lib/formats/webp";

export default function Command() {
  return <ConvertCommand from={fromPng} to={toWebp} />;
}
