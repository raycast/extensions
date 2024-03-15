import { toggleLowPowerMode } from "./utils/powerManagement";

export default async function main() {
  await toggleLowPowerMode();
}
