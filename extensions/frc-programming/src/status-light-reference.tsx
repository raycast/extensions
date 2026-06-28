import { open, popToRoot } from "@raycast/api";

export default async function Command() {
  await open("https://docs.wpilib.org/en/stable/docs/hardware/hardware-basics/status-lights-ref.html");
  await popToRoot();
}
