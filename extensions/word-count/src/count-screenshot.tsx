import { closeMainWindow, showHUD } from "@raycast/api";
import { count } from "./lib/count";
import { readFromScreenshot } from "./utils";

export default async function Command() {
  await closeMainWindow();

  try {
    const text = await readFromScreenshot();

    if (!text) {
      await showHUD("❌ Nothing to count!");
      return;
    }

    const result = count(text, true);

    const number = (value: number) => value.toLocaleString();
    const plural = (count: number, singular: string, plural: string) => (count === 1 ? singular : plural);

    // Default stats: Characters, Words, Sentences, Paragraphs
    const stats = [
      `${number(result.characters)} ${plural(result.characters, "char", "chars")}`,
      `${number(result.words)} ${plural(result.words, "word", "words")}`,
      `${number(result.sentences)} ${plural(result.sentences, "sentence", "sentences")}`,
      `${number(result.paragraphs)} ${plural(result.paragraphs, "paragraph", "paragraphs")}`,
    ];

    const hudMessage = `📊 ${stats.join(" · ")}`;

    await showHUD(hudMessage);
  } catch (error) {
    console.error("Screenshot count error:", error);
    await showHUD("❌ Nothing to count!");
  }
}
