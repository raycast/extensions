import { NoViewCommand } from "./utils";

export default async function Command() {
  await NoViewCommand(`Toggling left menu`, `✅ Toggled left menu`, "hide left menu");
}
