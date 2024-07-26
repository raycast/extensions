export function generateImageMarkdown(image: string | null, height = 150) {
  return `![Illustration](${image || "question-mark.png"}?raycast-height=${height})`;
}
