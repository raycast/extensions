import PowerManagement from "./class/PowerManagement";

const powerManagement = new PowerManagement();

export default async function main() {
  await powerManagement.toggleLowPowerMode();
}
