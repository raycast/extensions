import { ConvertCommand } from "./lib/command";
import { toPdf } from "./lib/formats/pdf";
import { fromSvg } from "./lib/formats/svg";

export default function Command() {
  return <ConvertCommand from={fromSvg} to={toPdf} />;
}
