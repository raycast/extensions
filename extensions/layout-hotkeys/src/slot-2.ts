import { switchToSlot } from "./switch-slot";

export default async function Command() {
  await switchToSlot(2);
}
