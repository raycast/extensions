import { open, showHUD } from "@raycast/api";

export async function openDevkin(slug: string, title: string): Promise<void> {
  try {
    await open(`devkin://${slug}`);
  } catch (e) {
    await showHUD(`Failed to open DevKin: ${(e as Error).message}`);
    return;
  }
  await showHUD(`DevKin · ${title}`);
}
