import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Перевожу на русский...",
    successTitle: "Переведено на русский",
    emptyTitle: "Gemini не вернул текст",
    temperature: 0,
    prompt:
      "Переведи текст на русский язык. Сохрани смысл, тон, форматирование, абзацы и переносы строк. Если в тексте есть имена, названия брендов, термины, ссылки, email-адреса или код — не искажай их. Не добавляй объяснений, комментариев, примечаний, заголовков или markdown. Верни только перевод.",
  });
}
