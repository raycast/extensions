import semverMajor from "semver/functions/major.js";
import { loadCachedVersion } from "../utils.js";

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

const LEGACY_TITLE_TO_SLUG_RANGE_REGEX = /[^a-z\d-]/g;
const TITLE_TO_SLUG_RANGE_REGEX = /[^a-z\d]/g;

const titleToSlug = (title: string) => {
  const cachedVersion = loadCachedVersion();
  const [packageName, version] = cachedVersion.split(/@(?!.*@)/);
  const major = semverMajor(version);

  const isV3Pattern = packageName === "simple-icons" && major < 4;
  const isV4Pattern = packageName === "simple-icons" && major === 4;

  if (isV3Pattern) {
    return title
      .toLowerCase()
      .replace(/\+/g, "plus")
      .replace(/^\./, "dot-")
      .replace(/\.$/, "-dot")
      .replace(/\./g, "-dot-")
      .replace(/^&/, "and-")
      .replace(/&$/, "-and")
      .replace(/&/g, "-and-")
      .replace(/[ !:’']/g, "")
      .replace(/à|á|â|ã|ä/g, "a")
      .replace(/ç|č|ć/g, "c")
      .replace(/è|é|ê|ë/g, "e")
      .replace(/ì|í|î|ï/g, "i")
      .replace(/ñ|ň|ń/g, "n")
      .replace(/ò|ó|ô|õ|ö/g, "o")
      .replace(/š|ś/g, "s")
      .replace(/ù|ú|û|ü/g, "u")
      .replace(/ý|ÿ/g, "y")
      .replace(/ž|ź/g, "z");
  }

  return title
    .toLowerCase()
    .replace(TITLE_TO_SLUG_CHARS_REGEX, (char) => TITLE_TO_SLUG_REPLACEMENTS[char])
    .normalize("NFD")
    .replace(isV4Pattern ? LEGACY_TITLE_TO_SLUG_RANGE_REGEX : TITLE_TO_SLUG_RANGE_REGEX, "");
};

export const getIconSlug = (icon: IconData) => icon.slug || titleToSlug(icon.title);
