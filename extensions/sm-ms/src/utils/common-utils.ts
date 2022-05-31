export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function isUrl(text: string): boolean {
  const regex = /^((http|https|ftp):\/\/)?((?:[\w-]+\.)+[a-z\d]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i;
  return regex.test(text);
}

export const titleCase = (str: string) => {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
};
