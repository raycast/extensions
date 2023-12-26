import { powerManagement } from "./PowerManagement";

export default async function main() {
  await powerManagement.toggleLowPowerMode();
}
