export const isUrl = (url: string) => {
  try {
    new URL(url);
    return true; // It's a valid URL
  } catch {
    return false; // It's not a valid URL
  }
};
