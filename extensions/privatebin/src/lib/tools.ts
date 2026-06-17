export function generatePassword(length: number = 8) {
  let result = "";
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export function isMarkdown(text: string) {
  const markdownPatterns = [
    /^#{1,6}\s.+/m, // Headers
    /^[-*+]\s.+/m, // Unordered lists
    /^\d+\.\s.+/m, // Ordered lists
    /\[.+]\(.+\)/, // Links
    /[*]{1,2}[^*]+[*]{1,2}/, // Bold/Italic (with star)
    /_{1,2}[^_]+_{1,2}/, // Bold/Italic (with underscore)
    /`{1,3}[^`]+`{1,3}/, // Inline or block code
  ];

  return markdownPatterns.some((pattern) => pattern.test(text));
}
