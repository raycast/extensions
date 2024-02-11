import { PowerManagement } from "./PowerManagement";

export default async function main() {
  const powerManagement = new PowerManagement();

  await powerManagement.toggleLowPowerMode();
}
