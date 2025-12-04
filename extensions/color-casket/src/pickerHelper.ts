import { APPLE } from "color-convert/conversions";
import { runAppleScript } from "run-applescript";
import { ColorType } from "./colors/Color";
import fromAppleColorFactory from "./colors/FromAppleColorFactory";

export default async function pickColor(type: ColorType) {
  try {
    const color = (await runAppleScript("choose color default color {65535, 65535, 65535}"))
      .split(", ")
      .map((value) => parseInt(value)) as APPLE;

    return fromAppleColorFactory(color, type);
  } catch (e) {
    return null;
  }
}
