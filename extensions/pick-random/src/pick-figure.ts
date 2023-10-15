import { showHUD, Clipboard } from "@raycast/api";

export default async function PickFigure() {
  const figures = "0123456789";
  const char = figures[Math.floor(Math.random() * figures.length)];

  await Clipboard.copy(char);
  await showHUD(`Copied ${char} to clipboard`);
}
