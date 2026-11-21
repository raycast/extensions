import { ConvertCommand } from "./lib/command";
import { fromHeic } from "./lib/formats/heic";
import { toJpg } from "./lib/formats/jpg";

export default function Command() {
  return <ConvertCommand from={fromHeic} to={toJpg} />;
}
