import { ConvertCommand } from "./lib/command";
import { toIco } from "./lib/formats/ico";
import { fromJpg } from "./lib/formats/jpg";

export default function Command() {
  return <ConvertCommand from={fromJpg} to={toIco} />;
}
