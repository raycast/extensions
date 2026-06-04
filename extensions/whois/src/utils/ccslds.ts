/**
 * A record of country-code top-level domains (ccTLDs) mapped to their
 * official and commonly used second-level domains (ccSLDs).
 *
 * This allows the domain parser to accurately identify base domains (e.g.
 * `example.co.uk` instead of `co.uk` or `sub.example.co.uk`) and prevents
 * false positives on ccTLDs that do not use these second-level spaces
 * (e.g. `sub.blog.io` -> `blog.io`).
 */
export const ccSLDs: Record<string, Set<string>> = {
  uk: new Set(["co", "org", "me", "ltd", "plc", "sch", "ac", "gov", "nhs", "police", "mod"]),
  us: new Set(["gov", "edu", "mil", "fed", "isa", "nsn", "state"]),
  ca: new Set(["gc", "ab", "bc", "mb", "nb", "nl", "ns", "nt", "nu", "on", "pe", "qc", "sk", "yk"]),
  br: new Set(["com", "org", "net", "edu", "gov", "adv", "art", "blog", "eco", "eng", "tv", "nom", "inf", "web"]),
  mx: new Set(["com", "org", "edu", "gob", "net"]),
  au: new Set(["com", "org", "net", "edu", "gov", "id", "asn"]),
  za: new Set(["co", "org", "web", "net", "gov", "ac", "edu", "law", "school", "nom"]),
  ar: new Set(["com", "org", "net", "gob", "edu", "tur"]),
  co: new Set(["com", "org", "net", "edu", "gov", "mil", "nom"]),
  in: new Set(["co", "org", "net", "firm", "gen", "ind", "nic", "edu", "res", "gov", "mil"]),
  jp: new Set(["co", "ne", "ed", "ac", "go", "or", "ad"]),
  es: new Set(["com", "org", "nom", "gob", "edu"]),
  cn: new Set(["com", "org", "net", "gov", "edu"]),
  nz: new Set(["co", "org", "net", "ac", "school", "geek", "kiwi"]),
  tr: new Set(["com", "org", "net", "edu", "gov", "info", "tv", "biz"]),
  id: new Set(["co", "web", "or", "go", "ac", "sch", "net"]),
  ru: new Set(["com", "net", "org", "pp"]),
  fr: new Set(["com", "asso", "nom", "prd", "presse", "tm"]),
  it: new Set(["gov", "edu"]),
  kr: new Set(["co", "ne", "or", "re", "pe", "go", "mil", "ac", "hs", "ms", "es", "sc"]),
  tw: new Set(["com", "org", "net", "edu", "gov", "idv"]),
  hk: new Set(["com", "org", "net", "edu", "gov", "idv"]),
  sg: new Set(["com", "org", "net", "edu", "gov", "idn"]),
  my: new Set(["com", "org", "net", "edu", "gov", "mil", "name"]),
  th: new Set(["co", "or", "net", "in", "ac", "go", "mi"]),
  vn: new Set(["com", "net", "org", "edu", "gov", "mil", "info", "biz", "name", "pro", "health", "ac"]),
  ph: new Set(["com", "org", "net", "edu", "gov", "mil", "ngo"]),
  cr: new Set(["co", "fi", "or", "ac", "go"]),
  ve: new Set(["com", "co", "org", "edu", "gob"]),
  pe: new Set(["com", "org", "net", "edu", "gob", "nom"]),
  uy: new Set(["com", "org", "net", "edu", "gub"]),
  cl: new Set(["gov", "gob", "edu"]),
  pl: new Set(["com", "net", "org", "info", "biz", "edu", "gov", "mil", "waw", "wroc", "krakow", "poznan"]),
  ua: new Set(["com", "edu", "gov", "net", "org", "in", "kiev", "kyiv", "lviv", "dp"]),
  pk: new Set(["com", "net", "org", "gov", "edu", "web", "fam", "biz"]),
  sa: new Set(["com", "net", "org", "gov", "med", "edu", "pub", "sch"]),
  ae: new Set(["co", "net", "org", "gov", "ac", "sch"]),
  gr: new Set(["com", "edu", "net", "org", "gov"]),
  pt: new Set(["com", "edu", "gov", "org"]),
  at: new Set(["co", "or", "gv"]),
  il: new Set(["co", "org", "net", "ac", "gov", "muni", "idf"]),
  ec: new Set(["com", "info", "net", "fin", "med", "pro", "org", "edu", "gov", "gob", "mil"]),
};
