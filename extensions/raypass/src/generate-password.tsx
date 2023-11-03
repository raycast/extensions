import { nanoid } from "nanoid";
import { showHUD } from "@raycast/api";
import { misc } from "./utils";

(async (): Promise<void> => {
  const password = nanoid();
  misc.copy(password);
  await showHUD(`Password (${password}) copied`);
})();
