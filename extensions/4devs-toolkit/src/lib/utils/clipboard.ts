import { Clipboard, showToast, Toast } from "@raycast/api";

export async function copyToClipboard(text: string, message?: string): Promise<void> {
  await Clipboard.copy(text);
  await showToast({
    style: Toast.Style.Success,
    title: message || "Copiado para área de transferência",
  });
}

export async function pasteToFrontmostApp(text: string): Promise<void> {
  await Clipboard.paste(text);
  await showToast({
    style: Toast.Style.Success,
    title: "Colado no aplicativo ativo",
  });
}
