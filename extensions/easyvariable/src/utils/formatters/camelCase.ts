export const formatCamelCase = (text: string) => {
  return text
    .split(/[\s_-]+/)
    .map((word, index) => {
      if (word.toUpperCase() === word && word.length > 1) {
        return index === 0 ? word.toLowerCase() : word;
      }
      return index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
};
