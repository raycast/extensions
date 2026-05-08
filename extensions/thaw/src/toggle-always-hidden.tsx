import { openThawUrl } from "@utils";

export default async function ToggleAlwaysHidden() {
  await openThawUrl("toggle-always-hidden", "Toggled Always Hidden Section");
}
