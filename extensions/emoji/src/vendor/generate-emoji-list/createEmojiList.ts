// vendored from https://github.com/leodr/generate-emoji-list and modified to read emoji data from the `assets/` folder.
import { environment } from "@raycast/api";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Emoji, EmojiList } from "./emojiListTypes";
import { getEmojiShortCodes } from "./getEmojiShortCodes";

interface CreateEmojiListOptions {
  unicodeVersion?: UnicodeVersion;
  features?: {
    shortCodes: boolean;
  };
}

export async function createEmojiList(options?: CreateEmojiListOptions): Promise<EmojiList<Emoji>> {
  const { unicodeVersion = "13.0", features = { shortCodes: true } } = options ?? {};

  const emojiList = await getEmojiList(unicodeVersion);

  if (features.shortCodes) {
    const shortCodeMap = await getEmojiShortCodes();

    return emojiList.map((category) => ({
      ...category,
      emojis: category.emojis.map(({ emoji, description, modifiers }) => ({
        emoji,
        description,
        modifiers,
        shortCode: shortCodeMap.get(emoji) ?? [],
      })),
    }));
  }

  return emojiList;
}

export type UnicodeVersion = "4.0" | "5.0" | "11.0" | "12.0" | "12.1" | "13.0" | "13.1" | "14.0" | "15.0" | "15.1";

const LINE_REGEX = /^.*?; fully-qualified\s+# (.*?) (?:E\d+\.\d+ )?(.*)$/;
const GROUP_REGEX = /^# group: (.*?)$/;

export async function getEmojiList(unicodeVersion: UnicodeVersion): Promise<EmojiList<Emoji>> {
  const content = readFileSync(path.join(environment.assetsPath, `${unicodeVersion}/emoji-test.txt`), {
    encoding: "utf8",
  });

  const lines = content.replace(/\r/g, "").split(/\n/);
  const categories: EmojiList<Emoji> = [];

  for (const line of lines) {
    const groupMatch = line.match(GROUP_REGEX);

    if (groupMatch !== null) {
      categories.push({
        category: groupMatch[1],
        emojis: [],
      });
    } else {
      const emojiMatch = line.match(LINE_REGEX);

      if (emojiMatch !== null) {
        const [, emoji, description] = emojiMatch;

        const currentCategory = categories[categories.length - 1];

        /**
         * Don't add emojis that have modified skin-tone but add a `s`-
         * modifier to the modifiable emoji, so we can modify it in an
         * emoji picker.
         */
        if (description.includes("skin tone")) {
          const lastEmoji = currentCategory.emojis[currentCategory.emojis.length - 1];

          if (!lastEmoji.modifiers.includes("skin-tone")) {
            lastEmoji.modifiers.push("skin-tone");
          }
        } else {
          currentCategory.emojis.push({
            emoji,
            description,
            modifiers: [],
          });
        }
      }
    }
  }

  return categories.filter((category) => category.emojis.length > 0);
}
