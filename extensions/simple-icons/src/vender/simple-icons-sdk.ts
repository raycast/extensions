type SpdxLicense = {
  type: string;
  url: string;
};

type CustomLicense = {
  type: "custom";
  url: string;
};

type Aliases = {
  aka?: string[];
  dup?: DuplicateAlias[];
  loc?: Record<string, string>;
  old?: string[];
};

type DuplicateAlias = {
  title: string;
  hex?: string;
  guidelines?: string;
  loc?: Record<string, string>;
};

export type IconData = {
  title: string;
  hex: string;
  source: string;
  slug?: string;
  guidelines?: string;
  license?: Omit<SpdxLicense, "url"> | CustomLicense;
  aliases?: Aliases;
};

const TITLE_TO_SLUG_REPLACEMENTS: Record<string, string> = {
  "+": "plus",
  ".": "dot",
  "&": "and",
  đ: "d",
  ħ: "h",
  ı: "i",
  ĸ: "k",
  ŀ: "l",
  ł: "l",
  ß: "ss",
  ŧ: "t",
  ø: "o",
};

const TITLE_TO_SLUG_CHARS_REGEX = new RegExp(`[${Object.keys(TITLE_TO_SLUG_REPLACEMENTS).join("")}]`, "g");

const TITLE_TO_SLUG_RANGE_REGEX = /[^a-z\d]/g;

const titleToSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(TITLE_TO_SLUG_CHARS_REGEX, (char) => TITLE_TO_SLUG_REPLACEMENTS[char])
    .normalize("NFD")
    .replace(TITLE_TO_SLUG_RANGE_REGEX, "");

export const getIconSlug = (icon: IconData) => icon.slug || titleToSlug(icon.title);
