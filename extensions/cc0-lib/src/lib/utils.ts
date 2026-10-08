export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
};

export const shortDomainName = (source: string) => {
  const domain = source.replace("http://", "").replace("https://", "").replace("www.", "").split("/")[0];

  return domain;
};

export const convertStringCase = (str: string, caseType: CaseType): string => {
  let result: string;

  switch (caseType) {
    case "camel":
      result = str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, "");
      break;

    case "pascal":
      result = str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
          return word.toUpperCase();
        })
        .replace(/\s+/g, "");
      break;

    case "kebab":
      result = str.replace(/\s+/g, "-").toLowerCase();
      break;

    case "snake":
      result = str.replace(/\s+/g, "_").toLowerCase();
      break;

    default:
      throw new Error("Invalid case type specified.");
  }

  return result;
};
