import { runMenuCloakAction } from "./menucloak";

export default async function Command() {
  await runMenuCloakAction("toggle", "MenuCloak toggled");
}
