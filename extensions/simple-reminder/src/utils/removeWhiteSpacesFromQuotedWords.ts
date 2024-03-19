export const removeWhiteSpacesFromQuotedWords = (input: string) => {
  return input.replace(/"\s+(.*?)\s+"/g, (match, group) => `"${group.trim()}"`);
};
