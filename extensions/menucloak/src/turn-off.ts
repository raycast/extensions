import { runMenuCloakAction } from "./menucloak";

export default async function Command() {
  await runMenuCloakAction("off", "MenuCloak is off");
}
