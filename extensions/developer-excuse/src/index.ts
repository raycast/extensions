import { showHUD, Clipboard } from "@raycast/api";

import excuses from "./excuses";

export default async function main() {
  const randomExcuse: string = getRandomElement(excuses);
  await Clipboard.paste(randomExcuse);
  await showHUD("✅ Pasted excuse");
}

const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
