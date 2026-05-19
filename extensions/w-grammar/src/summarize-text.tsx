import { processSelectedText } from "./utils";

export default async function Command() {
  await processSelectedText({
    loadingTitle: "Сокращаю текст...",
    successTitle: "Текст сокращён",
    emptyTitle: "Gemini не вернул текст",
    temperature: 0,
    prompt:
      "Сильно сократи текст. Оставь только главное, убери повторы, лишние детали и второстепенные формулировки. Сохрани исходный язык и основной смысл. Итоговый текст должен быть значительно короче исходного. Верни только сокращённый текст без объяснений.",
  });
}
