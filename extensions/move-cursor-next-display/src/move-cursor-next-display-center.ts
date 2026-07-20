import { showMoveCursorToast } from "./move-cursor-command";

export default async function Command() {
  await showMoveCursorToast("next", "center");
}
