import { PopToRootType, environment, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import path from "path";

type Display =
  | {
      index: string;
      name: string;
      id: string;
    }
  | undefined;

export default async function SwitchSource(sourceNumber: string) {
  const m1ddcPath = path.join(environment.assetsPath, `m1ddc-${process.arch}`);
  execSync(`chmod u+x ${m1ddcPath}`);
  const output = execSync(`${m1ddcPath} display list`);
  const displays = parseDisplayList(output.toString());
  const extDisplay = displays.findLast((o) => o !== undefined && o.name !== "Default");
  // DisplayPort 1: 15, DisplayPort 2: 16, HDMI 1: 17, HDMI 2: 18, USB-C: 27.
  if (extDisplay) execSync(`${m1ddcPath} display ${extDisplay?.id} set input ${sourceNumber}`);
  else await showHUD("Extended display not found 🤣", { popToRootType: PopToRootType.Immediate });
}

function parseDisplayList(str: string): Display[] {
  const lines = str.split("\n");
  const displays = lines
    .map((line) => {
      const match = line.match(/\[(\d+)\] (.+) \((.+)\)/);
      if (match) {
        return {
          index: match[1],
          name: match[2] === "(null)" ? "Default" : match[2],
          id: match[3],
        };
      }
    })
    .filter(Boolean);

  return displays;
}
