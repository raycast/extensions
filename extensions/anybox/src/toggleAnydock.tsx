import { postAndCloseMainWindow } from "./utilities/fetch";

export default async function main() {
  // You can also use "toggle-anydock-menu-bar-icon"
  // to toggle Anydock menu bar icon.
  await postAndCloseMainWindow("toggle-anydock");
}
