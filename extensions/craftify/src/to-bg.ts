import { translateCommand } from "./internal/translateCommand";

export default async function Command() {
  return translateCommand({
    targetLanguage: "bulgarian",
    nativeLangExample: "Hi, this is a message with `markdown` and <b>tags</b>",
    targetLangExample: "Здравей, това е съобщение с `markdown` и <b>тегове</b>",
  });
}
