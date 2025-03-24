import { Clipboard } from "@raycast/api";

export default async function pasteClipboard() {
  // Liest den aktuellen Inhalt der Zwischenablage
  const clipboardContent = await Clipboard.readText();

  if (clipboardContent) {
    // Überprüfen, ob der Prefix "hazu.swiss/" bereits vorhanden ist
    const prefix = "hazu.swiss/";
    let newString = clipboardContent;

    if (!clipboardContent.startsWith(prefix)) {
      // Wenn der Prefix nicht vorhanden ist, füge ihn hinzu
      newString = prefix + clipboardContent;
    }

    // Fügt den (gegebenenfalls modifizierten) Inhalt an der aktuellen Cursor-Position ein
    await Clipboard.paste(newString);
  }
}
