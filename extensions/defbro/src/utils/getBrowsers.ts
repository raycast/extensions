import execPromise from "../utils/execPromise";
import { Browser } from "../types";

export const getBrowsers = async (defbroPath: string) => {
  const { stdout } = await execPromise(defbroPath);

  return stdout.split("\n").reduce<Browser[]>((prev, line) => {
    const text = line.trim();
    if (!text) {
      return prev;
    }

    const isDefault = text.startsWith("*");
    const cleanText = isDefault ? text.slice(1).trim() : text;

    const match = cleanText.match(/^(.+?) \((.+)\)$/);
    if (match) {
      const [, id, title] = match;
      const browser = { id, title, default: isDefault };

      prev.push(browser);
    }

    return prev;
  }, []);
};
