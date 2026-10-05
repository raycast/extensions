import { showHUD, Clipboard } from "@raycast/api";

import excuses from "./excuses";

export default async function main() {
  const randomExcuse = getRandomElement(excuses);
  await Clipboard.paste(randomExcuse);
  await showHUD("✅ Pasted excuse");
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
