import { runLockpawCommand } from "./lockpaw";

export default async function Command() {
  await runLockpawCommand("toggle", "Lock toggled");
}
