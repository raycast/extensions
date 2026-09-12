const extractUrls = (inputText: string): string[] => {
  const urlPattern = /https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
  const matches = inputText.match(urlPattern);
  return matches || [];
};

export const filterArxivUrls = (inputText: string): string[] => {
  const urls = extractUrls(inputText);
  return urls.filter((url) => url.includes("arxiv.org"));
};
