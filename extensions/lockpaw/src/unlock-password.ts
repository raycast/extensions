import { runLockpawCommand } from "./lockpaw";

export default async function Command() {
  await runLockpawCommand("unlock-password", "Unlocking with password");
}
