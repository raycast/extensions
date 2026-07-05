import { runRecognition } from "./ocr";

export default async function Command() {
  await runRecognition("area");
}
