import { showHUD } from "@raycast/api";
import { mediaNext } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    await mediaNext();
    await showHUD("⏭ Next Track");
  } catch (error) {
    await handleCLIError(error);
  }
}
