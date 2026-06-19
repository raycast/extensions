import { openThawUrl } from "@utils";

export default async function ToggleThawbar() {
  await openThawUrl("toggle-thawbar", "Toggled Thawbar");
}
