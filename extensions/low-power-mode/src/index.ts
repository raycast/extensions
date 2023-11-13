import { isLowPowerModeEnabled, setLowPowerModeState } from "./utils";

export default async function main() {
  const lowPowerMode = isLowPowerModeEnabled();
  await setLowPowerModeState(!lowPowerMode);
}
