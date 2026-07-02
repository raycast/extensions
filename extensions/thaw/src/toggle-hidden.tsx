import { openThawUrl } from "@utils";

export default async function ToggleHidden() {
  await openThawUrl("toggle-hidden", "Toggled Hidden Section");
}
