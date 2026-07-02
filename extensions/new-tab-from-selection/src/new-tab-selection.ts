import { openForText, readSelection } from "./run";

export default async function main() {
  // readSelection returns "" on no selection / no access; openForText then shows
  // "No text selected". open() failures are handled inside openForText.
  await openForText(await readSelection(), "No text selected");
}
