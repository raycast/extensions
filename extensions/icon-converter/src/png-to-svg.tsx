import { ConvertCommand } from "./lib/command";
import { fromPng } from "./lib/formats/png";
import { toSvg } from "./lib/formats/trace";

export default function Command() {
  return <ConvertCommand from={fromPng} to={toSvg} />;
}
