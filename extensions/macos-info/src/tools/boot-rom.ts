import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("boot_rom_version", (value) => `Your Mac's Boot ROM version is ${value}`);
}
