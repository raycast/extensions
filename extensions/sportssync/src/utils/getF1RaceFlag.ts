const countryShortMap = {
  Australia: "aus",
  Bahrain: "bhr",
  Spain: "esp",
  Monaco: "mco",
  Azerbaijan: "aze",
  Canada: "can",
  Austria: "aut",
  "United Kingdom": "gbr",
  Britain: "gbr",
  Hungary: "hun",
  Belgium: "bel",
  Netherlands: "nld",
  Italy: "ita",
  Russia: "rus",
  Singapore: "sgp",
  Japan: "jpn",
  USA: "usa",
  Mexico: "mex",
  Brazil: "bra",
  Qatar: "qat",
  "Saudi Arabia": "ksa",
  "United Arab Emirates": "are",
  France: "fra",
  Germany: "deu",
  Turkey: "tur",
  "South Africa": "zaf",
  Malaysia: "mys",
  China: "chn",
};

export default function getCountryCode(countryName: string): string {
  return countryShortMap[countryName as keyof typeof countryShortMap] || "unknown";
}
