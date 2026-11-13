import { runMenuCloakAction } from "./menucloak";

export default async function Command() {
  await runMenuCloakAction("on", "MenuCloak is on");
}
