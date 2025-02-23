import { showHUD, Clipboard } from "@raycast/api";
import excuses from "./excuses";

export default async function main() {
  const randomExcuse: string = getRandomElement(excuses);
  await Clipboard.copy(randomExcuse);
  await showHUD(`✅ Pasted your excuse`);

  await Clipboard.paste(randomExcuse);
}

// Function to get a random element from an array
const getRandomElement = (arr: string[]): string => arr[Math.floor(Math.random() * arr.length)];
