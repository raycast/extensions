import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";

// The transcription text is passed through a callback rather than an action's
// `content` prop on purpose: props end up in Raycast's serialized render tree,
// and a hundred full transcriptions there is what used to break it. showHUD
// still confirms the action and closes the window.
export async function copyAndConfirm(text: string): Promise<void> {
  await Clipboard.copy(text);
  await showHUD("Copied to Clipboard");
}

export async function pasteToActiveApp(text: string): Promise<void> {
  await closeMainWindow();
  await Clipboard.paste(text);
}
