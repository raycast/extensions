import { translateCommand } from "./internal/translateCommand";

export default async function Command() {
  return translateCommand({
    targetLanguage: "english",
    nativeLangExample: "Привет, это сообщение с `markdown` и <b>тегами</b>",
    targetLangExample: "Hi, this is a message with `markdown` and <b>tags</b>",
  });
}
