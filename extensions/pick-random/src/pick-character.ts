import { showHUD, Clipboard } from "@raycast/api";

export default async function PickCharacter() {
  const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const char = characters[Math.floor(Math.random() * characters.length)];

  await Clipboard.copy(char);
  await showHUD(`Copied ${char} to clipboard`);
}
