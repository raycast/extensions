import { showHUD } from "@raycast/api";

export default async function handleError(error: Error): Promise<void> {
  return await showHUD(`❌ ${error.message}`);
}
