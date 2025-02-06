import { Clipboard } from "@raycast/api";
import { showCopyToast } from "../components/CopyToast";

export async function copySecretToClipboard(secret: string) {
  await Clipboard.copy(secret);
  await showCopyToast();
} 
