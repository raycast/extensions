import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

interface AdbDisplayDensityArguments {
  factor: string;
}

export default async function displayDensity(props: LaunchProps<{ arguments: AdbDisplayDensityArguments }>) {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const factor = Number(props.arguments.factor);
  const currentDensities = execSync(`${adbDir} shell wm density`).toString();
  let defaultDensity = 0;
  const densitiesArray = currentDensities.split("\n").slice(0, -1);
  densitiesArray.forEach((density) => {
    if (density.includes("Physical density")) {
      defaultDensity = Number(density.split(": ")[1]);
    }
  });
  let density;
  if (factor == 1.0) {
    density = defaultDensity;
  } else if (factor == 2) {
    density = defaultDensity + 50;
  } else if (factor >= 3) {
    density = defaultDensity + 100;
  } else if (factor <= 0.5) {
    density = 374;
  } else {
    density = factor;
  }

  await showHUD(`🔎 Setting display density to ${density}`);
  execSync(`${adbDir} shell wm density ${density}`);
}
