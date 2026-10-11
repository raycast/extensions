import { finderFolder } from "./finder";
import { scanWithSizewise, showScanFailure } from "./sizewise";

export default async function Command() {
  try {
    await scanWithSizewise(await finderFolder());
  } catch (error) {
    await showScanFailure(error, "Couldn't scan in Sizewise");
  }
}
