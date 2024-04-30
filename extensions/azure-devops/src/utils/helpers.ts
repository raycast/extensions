export const toSnakeCase = (str: string) => {
  return str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g) // Match words
    ?.map((x) => x.toLowerCase()) // Convert to lowercase
    ?.join("_"); // Join words with underscores
};
