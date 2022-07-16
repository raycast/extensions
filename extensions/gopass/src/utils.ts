export const capitalize = (string: string) => string[0].toUpperCase().concat(string.slice(1));

export const humanize = (string: string) => (string === "url" ? string.toUpperCase() : capitalize(string));
