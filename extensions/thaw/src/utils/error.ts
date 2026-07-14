import { showHUD } from "@raycast/api";

export const showError = async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  await showHUD(`Error: ${message}`);
};
