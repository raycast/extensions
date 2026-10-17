export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const CODES =
  "en zh zh-Hans zh-Hant yue de es ru ko fr ja pt tr pl ca nl ar sv it id hi fi vi he uk el ms cs ro da hu ta no th ur hr bg lt la mi ml cy sk te fa lv bn sr az sl kn et mk br eu is hy ne mn bs kk sq sw gl mr pa si km sn yo so af oc ka be tg sd gu am yi lo uz fo ht ps tk nn mt sa lb my bo tl mg as tt haw ln ha ba jw su".split(
    " ",
  );
const FALLBACK: Record<string, string> = {
  yue: "Cantonese",
  zh: "Chinese",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
  jw: "Javanese",
  tl: "Filipino",
};

function displayName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) || FALLBACK[code] || code;
  } catch {
    return FALLBACK[code] || code;
  }
}

export function getLanguages(supported?: string[], includeAuto = true): LanguageOption[] {
  const codes = supported?.length ? CODES.filter((code) => supported.includes(code)) : CODES;
  const languages = codes.map((code) => ({
    code,
    name: displayName(code, "en"),
    nativeName: displayName(code, code.includes("-") ? code : code),
  }));
  return includeAuto
    ? [{ code: "auto", name: "Automatic Detection", nativeName: "Automatic" }, ...languages]
    : languages;
}
