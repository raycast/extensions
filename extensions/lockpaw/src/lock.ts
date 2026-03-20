import { runLockpawCommand } from "./lockpaw";

export default async function Command() {
  await runLockpawCommand("lock", "Screen locked");
}
