import { translateCommand } from "./internal/translateCommand";

export default async function Command() {
  return translateCommand({
    targetLanguage: "ukrainian",
    nativeLangExample: "Hi, this is a message with `markdown` and <b>tags</b>",
    targetLangExample: "Привіт, це повідомлення з `markdown` і <b>тегами</b>",
  });
}
