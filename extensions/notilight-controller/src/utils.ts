import { open, showHUD, closeMainWindow, PopToRootType } from "@raycast/api";

export async function openDeepLink(command: string) {
  const url = `notilight://${command}`;
  try {
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
    await open(url);
    await showHUD(`Executed: ${command}`);
  } catch (error) {
    await showHUD(`Failed to execute: ${command}`);
    console.error(error);
  }
}
