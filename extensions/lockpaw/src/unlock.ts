import { runLockpawCommand } from "./lockpaw";

export default async function Command() {
  await runLockpawCommand("unlock", "Unlocking with Touch ID");
}
