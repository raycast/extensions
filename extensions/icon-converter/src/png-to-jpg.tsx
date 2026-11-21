import { ConvertCommand } from "./lib/command";
import { toJpg } from "./lib/formats/jpg";
import { fromPng } from "./lib/formats/png";

export default function Command() {
  return <ConvertCommand from={fromPng} to={toJpg} />;
}
