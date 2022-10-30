export function toCamelCase(text: string): string {
  text = text
    .replace(/[^\w\s']|_/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return convertFirstLetterToLowerCase(
    text
      .replaceAll(/\s\s+/g, " ")
      .replaceAll(" ", "-")
      .replace(/([-_][a-z])/gi, ($1) => {
        return $1.toUpperCase().replace("-", "").replace("_", "");
      })
  );
}

function convertFirstLetterToLowerCase(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function capitalizeAllFirstLetters(text: string): string {
  return text.replace(/\b\w/g, (l) => l.toUpperCase());
}

export function kebabCase(text: string): string {
  text = text
    .replace(/[^\w\s']|_/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.replaceAll(/\s\s+/g, " ").replaceAll(" ", "-").toLowerCase();
}

export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

export function toPascalCase(text: string): string {
  return capitalizeAllFirstLetters(toCamelCase(text));
}
