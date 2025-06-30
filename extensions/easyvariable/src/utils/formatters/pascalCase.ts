export const formatPascalCase = (text: string) => {
  return text
    .split(/[\s_-]+/)
    .map((word) => {
      if (word.toUpperCase() === word && word.length > 1) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
};
