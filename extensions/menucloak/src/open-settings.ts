import { runMenuCloakAction } from "./menucloak";

export default async function Command() {
  await runMenuCloakAction("settings", "Opening MenuCloak settings");
}
