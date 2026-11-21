import { ConvertCommand } from "./lib/command";
import { toIco } from "./lib/formats/ico";
import { fromPng } from "./lib/formats/png";

export default function Command() {
  return <ConvertCommand from={fromPng} to={toIco} />;
}
