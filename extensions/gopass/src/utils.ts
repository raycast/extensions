export const capitalize = (string: string) => string[0].toUpperCase().concat(string.slice(1));

export const humanize = (string: string) => (string === "url" ? string.toUpperCase() : capitalize(string));

export const isDirectory = (string: string) => string.endsWith("/");

export const sortDirectoriesFirst = (array: string[]) =>
  array.sort((a, b) => (isDirectory(a) && !isDirectory(b) ? -1 : 0));
