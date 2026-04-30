import { showHUD } from "@raycast/api";
import { mediaPrevious } from "./lib/cli";
import { handleCLIError } from "./components/error-handler";

export default async function Command() {
  try {
    await mediaPrevious();
    await showHUD("⏮ Previous Track");
  } catch (error) {
    await handleCLIError(error);
  }
}
