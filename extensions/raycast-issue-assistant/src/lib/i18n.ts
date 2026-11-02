const strings: Record<string, Record<string, string>> = {
  en: { search: "Search Issues", empty: "Nothing here" },
  de: { search: "Vorgänge suchen", empty: "Nichts gefunden" },
};

const activeLocale = process.env.LANG?.slice(0, 2) ?? "en";

export const t = (key: string) => strings[activeLocale][key];
