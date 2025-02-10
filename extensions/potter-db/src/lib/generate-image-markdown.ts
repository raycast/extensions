import { environment } from "@raycast/api";

export function generateImageMarkdown(image: string | null, height = 150) {
  const questionMarkImage = environment.appearance === "dark" ? "question-mark@dark.png" : "question-mark.png";
  return `![Illustration](${image || questionMarkImage}?raycast-height=${height})`;
}
