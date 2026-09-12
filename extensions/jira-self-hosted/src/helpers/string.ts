export const slugify = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const replaceAsync = async (
  text: string,
  searchValue: string | RegExp,
  asyncReplacer: (match: string, ...args: string[]) => Promise<string>,
) => {
  const promises: Promise<string>[] = [];
  text.replace(searchValue, (match, ...args) => {
    const promise = asyncReplacer(match, ...args);
    promises.push(promise);
    return match;
  });
  const data = await Promise.all(promises);
  return text.replace(searchValue, () => data.shift() as string);
};
