import {
  Faker,
  fakerCS_CZ,
  fakerDA,
  fakerDE,
  fakerDE_AT,
  fakerDE_CH,
  fakerEN_AU,
  fakerEN_GB,
  fakerEN_IE,
  fakerEN_US,
  fakerES,
  fakerFI,
  fakerFR,
  fakerHR,
  fakerHU,
  fakerIT,
  fakerLV,
  fakerNB_NO,
  fakerNL,
  fakerNL_BE,
  fakerPL,
  fakerPT_PT,
  fakerRO,
  fakerSK,
  fakerSL_SI,
  fakerSV,
} from "@faker-js/faker";
import { CountryCode } from "libphonenumber-js";
import { luhnCheckDigit } from "./checksum";
import { abaRouting } from "./financial";
import { generateIban, ibanCountry } from "./iban";
import { generatePhone, PhoneMode } from "./phone";
import { digits, int, letters, nonZeroDigits, pick } from "./random";
import { abnFromBody, acn, ein, nzbn } from "./taxid";
import { Field } from "./types";
import { generateVat, vatCountry } from "./vat";

type Language = "nl" | "fr" | "de" | "en" | "es" | "it" | "pt" | "other";
type AddressStyle = "eu" | "gb" | "us" | "au" | "nz" | "ie" | "lu";

/** [city, postcode pattern, region?]. Pattern: # = digit, ? = letter, * = Eircode character. */
type City = [string, string, string?];

export interface Profile {
  id: string;
  iso: CountryCode;
  name: string;
  faker: Faker;
  language: Language;
  legalForms: string[];
  addressStyle: AddressStyle;
  cities?: City[];
}

export const PROFILES: Profile[] = [
  {
    id: "BE-nl",
    iso: "BE",
    name: "Belgium (Dutch)",
    faker: fakerNL_BE,
    language: "nl",
    legalForms: ["BV", "BV", "NV", "CV", "VOF", "VZW"],
    addressStyle: "eu",
    cities: [
      ["Brussel", "1000"],
      ["Antwerpen", "2000"],
      ["Gent", "9000"],
      ["Brugge", "8000"],
      ["Leuven", "3000"],
      ["Mechelen", "2800"],
      ["Hasselt", "3500"],
      ["Kortrijk", "8500"],
      ["Aalst", "9300"],
      ["Oostende", "8400"],
      ["Sint-Niklaas", "9100"],
      ["Genk", "3600"],
    ],
  },
  {
    id: "BE-fr",
    iso: "BE",
    name: "Belgium (French)",
    faker: fakerFR,
    language: "fr",
    legalForms: ["SRL", "SRL", "SA", "SC", "SNC", "ASBL"],
    addressStyle: "eu",
    cities: [
      ["Bruxelles", "1000"],
      ["Liège", "4000"],
      ["Namur", "5000"],
      ["Charleroi", "6000"],
      ["Mons", "7000"],
      ["Wavre", "1300"],
      ["Ottignies-Louvain-la-Neuve", "1348"],
      ["Tournai", "7500"],
      ["Arlon", "6700"],
      ["Nivelles", "1400"],
    ],
  },
  {
    id: "NL",
    iso: "NL",
    name: "Netherlands",
    faker: fakerNL,
    language: "nl",
    legalForms: ["B.V.", "B.V.", "N.V.", "V.O.F."],
    addressStyle: "eu",
    cities: [
      ["Amsterdam", "1012 ??"],
      ["Rotterdam", "3011 ??"],
      ["Den Haag", "2511 ??"],
      ["Utrecht", "3511 ??"],
      ["Eindhoven", "5611 ??"],
      ["Groningen", "9711 ??"],
      ["Tilburg", "5038 ??"],
      ["Breda", "4811 ??"],
      ["Nijmegen", "6511 ??"],
      ["Haarlem", "2011 ??"],
    ],
  },
  {
    id: "DE",
    iso: "DE",
    name: "Germany",
    faker: fakerDE,
    language: "de",
    legalForms: ["GmbH", "GmbH", "AG", "KG", "GmbH & Co. KG", "UG (haftungsbeschränkt)"],
    addressStyle: "eu",
    cities: [
      ["Berlin", "10115"],
      ["Hamburg", "20095"],
      ["München", "80331"],
      ["Köln", "50667"],
      ["Frankfurt am Main", "60311"],
      ["Stuttgart", "70173"],
      ["Düsseldorf", "40213"],
      ["Leipzig", "04109"],
      ["Dresden", "01067"],
      ["Hannover", "30159"],
      ["Nürnberg", "90402"],
      ["Bremen", "28195"],
    ],
  },
  {
    id: "AT",
    iso: "AT",
    name: "Austria",
    faker: fakerDE_AT,
    language: "de",
    legalForms: ["GmbH", "GmbH", "AG", "KG", "OG"],
    addressStyle: "eu",
    cities: [
      ["Wien", "1010"],
      ["Graz", "8010"],
      ["Linz", "4020"],
      ["Salzburg", "5020"],
      ["Innsbruck", "6020"],
      ["Klagenfurt", "9020"],
    ],
  },
  {
    id: "CH-de",
    iso: "CH",
    name: "Switzerland (German)",
    faker: fakerDE_CH,
    language: "de",
    legalForms: ["AG", "GmbH", "AG", "GmbH"],
    addressStyle: "eu",
    cities: [
      ["Zürich", "8001"],
      ["Basel", "4051"],
      ["Bern", "3011"],
      ["Luzern", "6003"],
      ["St. Gallen", "9000"],
      ["Winterthur", "8400"],
    ],
  },
  {
    id: "CH-fr",
    iso: "CH",
    name: "Switzerland (French)",
    faker: fakerFR,
    language: "fr",
    legalForms: ["SA", "Sàrl", "SA", "Sàrl"],
    addressStyle: "eu",
    cities: [
      ["Genève", "1201"],
      ["Lausanne", "1003"],
      ["Neuchâtel", "2000"],
      ["Fribourg", "1700"],
      ["Sion", "1950"],
    ],
  },
  {
    id: "FR",
    iso: "FR",
    name: "France",
    faker: fakerFR,
    language: "fr",
    legalForms: ["SAS", "SAS", "SARL", "SA", "EURL", "SASU"],
    addressStyle: "eu",
    cities: [
      ["Paris", "75001"],
      ["Paris", "75008"],
      ["Paris", "75011"],
      ["Lyon", "69002"],
      ["Marseille", "13001"],
      ["Toulouse", "31000"],
      ["Nice", "06000"],
      ["Nantes", "44000"],
      ["Strasbourg", "67000"],
      ["Bordeaux", "33000"],
      ["Lille", "59000"],
      ["Rennes", "35000"],
      ["Montpellier", "34000"],
    ],
  },
  {
    id: "LU",
    iso: "LU",
    name: "Luxembourg",
    faker: fakerFR,
    language: "fr",
    legalForms: ["S.à r.l.", "S.A.", "SCS", "S.à r.l.-S"],
    addressStyle: "lu",
    cities: [
      ["Luxembourg", "1660"],
      ["Luxembourg", "2449"],
      ["Luxembourg", "1724"],
      ["Esch-sur-Alzette", "4002"],
      ["Differdange", "4501"],
      ["Dudelange", "3401"],
      ["Ettelbruck", "9001"],
    ],
  },
  {
    id: "GB",
    iso: "GB",
    name: "United Kingdom",
    faker: fakerEN_GB,
    language: "en",
    legalForms: ["Ltd", "Ltd", "Limited", "PLC", "LLP"],
    addressStyle: "gb",
    cities: [
      ["London", "EC1A #??"],
      ["London", "SE1 #??"],
      ["Manchester", "M1 #??"],
      ["Birmingham", "B1 #??"],
      ["Leeds", "LS1 #??"],
      ["Glasgow", "G1 #??"],
      ["Edinburgh", "EH1 #??"],
      ["Bristol", "BS1 #??"],
      ["Liverpool", "L1 #??"],
      ["Cardiff", "CF10 #??"],
      ["Belfast", "BT1 #??"],
    ],
  },
  {
    id: "IE",
    iso: "IE",
    name: "Ireland",
    faker: fakerEN_IE,
    language: "en",
    legalForms: ["Ltd", "Limited", "DAC", "PLC"],
    addressStyle: "ie",
    cities: [
      ["Dublin 2", "D02 ****"],
      ["Dublin 4", "D04 ****"],
      ["Dublin 8", "D08 ****"],
      ["Cork", "T12 ****"],
      ["Galway", "H91 ****"],
      ["Limerick", "V94 ****"],
      ["Waterford", "X91 ****"],
    ],
  },
  {
    id: "US",
    iso: "US",
    name: "United States",
    faker: fakerEN_US,
    language: "en",
    legalForms: ["LLC", "LLC", "Inc.", "Corp.", "Co."],
    addressStyle: "us",
    cities: [
      ["New York", "10001", "NY"],
      ["Los Angeles", "90012", "CA"],
      ["San Francisco", "94103", "CA"],
      ["Chicago", "60601", "IL"],
      ["Houston", "77002", "TX"],
      ["Austin", "78701", "TX"],
      ["Phoenix", "85004", "AZ"],
      ["Seattle", "98101", "WA"],
      ["Denver", "80202", "CO"],
      ["Boston", "02108", "MA"],
      ["Miami", "33130", "FL"],
      ["Atlanta", "30303", "GA"],
    ],
  },
  {
    id: "AU",
    iso: "AU",
    name: "Australia",
    faker: fakerEN_AU,
    language: "en",
    legalForms: ["Pty Ltd", "Pty Ltd", "Pty Ltd", "Ltd"],
    addressStyle: "au",
    cities: [
      ["Sydney", "2000", "NSW"],
      ["Melbourne", "3000", "VIC"],
      ["Brisbane", "4000", "QLD"],
      ["Perth", "6000", "WA"],
      ["Adelaide", "5000", "SA"],
      ["Hobart", "7000", "TAS"],
      ["Canberra", "2600", "ACT"],
      ["Darwin", "0800", "NT"],
      ["Gold Coast", "4217", "QLD"],
      ["Newcastle", "2300", "NSW"],
    ],
  },
  {
    id: "NZ",
    iso: "NZ",
    name: "New Zealand",
    faker: fakerEN_AU,
    language: "en",
    legalForms: ["Limited", "Ltd", "Limited"],
    addressStyle: "nz",
    cities: [
      ["Auckland", "1010"],
      ["Wellington", "6011"],
      ["Christchurch", "8011"],
      ["Hamilton", "3204"],
      ["Tauranga", "3110"],
      ["Dunedin", "9016"],
      ["Napier", "4110"],
      ["Nelson", "7010"],
      ["Palmerston North", "4410"],
      ["Queenstown", "9300"],
    ],
  },
  {
    id: "ES",
    iso: "ES",
    name: "Spain",
    faker: fakerES,
    language: "es",
    legalForms: ["S.L.", "S.L.", "S.A.", "S.L.U."],
    addressStyle: "eu",
    cities: [
      ["Madrid", "28013"],
      ["Barcelona", "08001"],
      ["Valencia", "46001"],
      ["Sevilla", "41001"],
      ["Bilbao", "48001"],
      ["Málaga", "29001"],
      ["Zaragoza", "50001"],
      ["Palma", "07001"],
    ],
  },
  {
    id: "IT",
    iso: "IT",
    name: "Italy",
    faker: fakerIT,
    language: "it",
    legalForms: ["S.r.l.", "S.r.l.", "S.p.A.", "S.n.c.", "S.a.s."],
    addressStyle: "eu",
    cities: [
      ["Roma", "00184"],
      ["Milano", "20121"],
      ["Napoli", "80133"],
      ["Torino", "10121"],
      ["Firenze", "50122"],
      ["Bologna", "40121"],
      ["Venezia", "30121"],
      ["Genova", "16121"],
    ],
  },
  {
    id: "PT",
    iso: "PT",
    name: "Portugal",
    faker: fakerPT_PT,
    language: "pt",
    legalForms: ["Lda.", "Lda.", "S.A.", "Unipessoal Lda."],
    addressStyle: "eu",
    cities: [
      ["Lisboa", "1100-###"],
      ["Porto", "4000-###"],
      ["Braga", "4700-###"],
      ["Coimbra", "3000-###"],
      ["Faro", "8000-###"],
      ["Aveiro", "3800-###"],
    ],
  },
  {
    id: "PL",
    iso: "PL",
    name: "Poland",
    faker: fakerPL,
    language: "other",
    legalForms: ["sp. z o.o.", "S.A.", "sp.k."],
    addressStyle: "eu",
  },
  {
    id: "CZ",
    iso: "CZ",
    name: "Czechia",
    faker: fakerCS_CZ,
    language: "other",
    legalForms: ["s.r.o.", "a.s."],
    addressStyle: "eu",
  },
  {
    id: "SK",
    iso: "SK",
    name: "Slovakia",
    faker: fakerSK,
    language: "other",
    legalForms: ["s.r.o.", "a.s."],
    addressStyle: "eu",
  },
  {
    id: "HU",
    iso: "HU",
    name: "Hungary",
    faker: fakerHU,
    language: "other",
    legalForms: ["Kft.", "Zrt.", "Bt."],
    addressStyle: "eu",
  },
  {
    id: "RO",
    iso: "RO",
    name: "Romania",
    faker: fakerRO,
    language: "other",
    legalForms: ["S.R.L.", "S.A."],
    addressStyle: "eu",
  },
  {
    id: "HR",
    iso: "HR",
    name: "Croatia",
    faker: fakerHR,
    language: "other",
    legalForms: ["d.o.o.", "d.d."],
    addressStyle: "eu",
  },
  {
    id: "SI",
    iso: "SI",
    name: "Slovenia",
    faker: fakerSL_SI,
    language: "other",
    legalForms: ["d.o.o.", "d.d."],
    addressStyle: "eu",
  },
  {
    id: "SE",
    iso: "SE",
    name: "Sweden",
    faker: fakerSV,
    language: "other",
    legalForms: ["AB", "AB", "HB"],
    addressStyle: "eu",
  },
  {
    id: "NO",
    iso: "NO",
    name: "Norway",
    faker: fakerNB_NO,
    language: "other",
    legalForms: ["AS", "AS", "ASA"],
    addressStyle: "eu",
  },
  {
    id: "DK",
    iso: "DK",
    name: "Denmark",
    faker: fakerDA,
    language: "other",
    legalForms: ["ApS", "A/S", "I/S"],
    addressStyle: "eu",
  },
  {
    id: "FI",
    iso: "FI",
    name: "Finland",
    faker: fakerFI,
    language: "other",
    legalForms: ["Oy", "Oy", "Oyj"],
    addressStyle: "eu",
  },
  {
    id: "LV",
    iso: "LV",
    name: "Latvia",
    faker: fakerLV,
    language: "other",
    legalForms: ["SIA", "AS"],
    addressStyle: "eu",
  },
];

export function profile(id: string): Profile {
  return PROFILES.find((p) => p.id === id) ?? PROFILES[0];
}

// --- Helpers ---------------------------------------------------------------------------

const POSTCODE_LETTERS = "ABDEFGHJLNPRSTWXZ";
const EIRCODE_CHARS = "ACDEFHKNPRTVWXY0123456789";

function fillPostcode(pattern: string): string {
  for (;;) {
    const value = pattern
      .replace(/#/g, () => String(int(0, 9)))
      .replace(/\?/g, () => pick([...POSTCODE_LETTERS]))
      .replace(/\*/g, () => pick([...EIRCODE_CHARS]));
    // Dutch postcodes never use the letter pairs SA, SD and SS.
    if (!/\d{4} (SA|SD|SS)$/.test(value)) return value;
  }
}

/** Lowercase ASCII slug for emails and domains: slug("Jean-Ève Müller", ".") -> "jean.eve.muller". */
export function slug(value: string, separator = ""): string {
  return value
    .replace(/ß/g, "ss")
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .join(separator);
}

export interface Address {
  street: string;
  postcode: string;
  city: string;
  region?: string;
  country: string;
  oneLine: string;
  multiLine: string;
}

export function address(p: Profile): Address {
  const f = p.faker;
  let street = f.location.streetAddress();
  // Faker's Dutch/Belgian/German/... streets are "Name 12"; English ones "12 Name". Keep as generated.
  if (p.id === "BE-fr" || p.id === "LU" || p.id === "CH-fr") {
    // French faker yields "12 Rue X"; Belgium/Luxembourg/Switzerland write "Rue X 12".
    const m = street.match(/^(\d+\w*),? (.+)$/);
    if (m) street = `${m[2]} ${m[1]}`;
  }
  let city: string;
  let postcode: string;
  let region: string | undefined;
  if (p.cities) {
    const [c, pattern, r] = pick(p.cities);
    city = c;
    postcode = fillPostcode(pattern);
    region = r;
  } else {
    city = f.location.city();
    postcode = f.location.zipCode();
  }
  const country = p.name.replace(/ \(.+\)$/, "");
  let line2: string;
  switch (p.addressStyle) {
    case "gb":
    case "nz":
      line2 = `${city} ${postcode}`;
      break;
    case "ie":
      line2 = `${city}, ${postcode}`;
      break;
    case "us":
      line2 = `${city}, ${region} ${postcode}`;
      break;
    case "au":
      line2 = `${city} ${region} ${postcode}`;
      break;
    case "lu":
      line2 = `L-${postcode} ${city}`;
      break;
    default:
      line2 = `${postcode} ${city}`;
  }
  return {
    street,
    postcode: p.addressStyle === "lu" ? `L-${postcode}` : postcode,
    city,
    region,
    country,
    oneLine: `${street}, ${line2}`,
    multiLine: `${street}\n${line2}\n${country}`,
  };
}

// --- People ----------------------------------------------------------------------------

export interface Person {
  firstName: string;
  lastName: string;
  fullName: string;
  sex: "female" | "male";
  /** ISO date (YYYY-MM-DD). Strings keep the record JSON-serializable for caching. */
  birthdate: string;
  email: string;
  username: string;
  phone?: string;
  phoneNational?: string;
  phoneFictional: boolean;
  address: Address;
}

export function person(p: Profile, emailDomain: string, phoneMode: PhoneMode): Person {
  const f = p.faker;
  const sex = f.person.sex() as "female" | "male";
  const firstName = f.person.firstName(sex);
  const lastName = f.person.lastName(sex);
  const phone = generatePhone(p.iso, "mobile", phoneMode);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    sex,
    birthdate: f.date.birthdate({ mode: "age", min: 18, max: 80 }).toISOString().slice(0, 10),
    email: `${slug(firstName, ".")}.${slug(lastName, ".")}@${emailDomain}`,
    username: `${slug(firstName)}${slug(lastName).slice(0, 1)}${int(10, 99)}`,
    phone: phone?.compact,
    phoneNational: phone?.variants?.[0]?.value,
    phoneFictional: phone?.fictional ?? false,
    address: address(p),
  };
}

/** Hostname with at least one dot and an alphabetic TLD, e.g. "example.com" or "acme.test". */
const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function isValidDomain(domain: string): boolean {
  return DOMAIN_PATTERN.test(domain);
}

/** RFC 2606 / RFC 6761 names that never receive mail: example.com/.net/.org and the .test/.example/.invalid/.localhost TLDs. */
export function isReservedDomain(domain: string): boolean {
  return /(^|\.)(example\.(com|net|org)|example|test|invalid|localhost)$/.test(domain.toLowerCase());
}

export function emailVariants(firstName: string, lastName: string, domain: string): Field[] {
  const first = slug(firstName);
  const last = slug(lastName);
  const stamp = Date.now().toString(36);
  const words = ["blue", "swift", "quiet", "lucky", "brave", "sunny", "noble", "rapid", "misty", "happy"];
  const animals = ["fox", "owl", "otter", "lynx", "panda", "heron", "koala", "tiger", "whale", "badger"];
  return [
    { label: "first.last", value: `${first}.${last}@${domain}` },
    { label: "firstlast", value: `${first}${last}@${domain}` },
    { label: "f.last", value: `${first[0]}.${last}@${domain}` },
    { label: "first_last + number", value: `${first}_${last}${int(1, 99)}@${domain}` },
    { label: "Plus addressing", value: `${first}.${last}+test@${domain}` },
    { label: "Unique (plus + timestamp)", value: `${first}.${last}+${stamp}@${domain}` },
    { label: "Random username", value: `${pick(words)}${pick(animals)}${int(100, 999)}@${domain}` },
    { label: "Role address", value: `${pick(["info", "hello", "contact", "support", "billing", "admin"])}@${domain}` },
    { label: "example.org", value: `${first}.${last}@example.org` },
    { label: "example.net", value: `${first}.${last}@example.net` },
    { label: ".test TLD", value: `${first}.${last}@${pick(["acme", "mail", "company", "demo"])}.test` },
  ];
}

// --- Companies -------------------------------------------------------------------------

const INDUSTRY_WORDS: Record<Language, string[]> = {
  nl: [
    "Bouw",
    "Advies",
    "Logistiek",
    "Techniek",
    "Groep",
    "Partners",
    "Media",
    "Solutions",
    "Consultancy",
    "Installaties",
    "Vastgoed",
    "Digital",
  ],
  fr: [
    "Conseil",
    "Logistique",
    "Technologies",
    "Groupe",
    "Partenaires",
    "Construction",
    "Services",
    "Solutions",
    "Immobilier",
    "Digital",
    "Ingénierie",
  ],
  de: [
    "Bau",
    "Beratung",
    "Logistik",
    "Technik",
    "Gruppe",
    "Partner",
    "Medien",
    "Systeme",
    "Immobilien",
    "Digital",
    "Handel",
    "Consulting",
  ],
  en: [
    "Consulting",
    "Logistics",
    "Technologies",
    "Group",
    "Partners",
    "Construction",
    "Media",
    "Solutions",
    "Holdings",
    "Digital",
    "Ventures",
    "Labs",
  ],
  es: [
    "Consultoría",
    "Logística",
    "Tecnologías",
    "Grupo",
    "Construcciones",
    "Servicios",
    "Soluciones",
    "Inmobiliaria",
    "Digital",
  ],
  it: [
    "Consulenze",
    "Logistica",
    "Tecnologie",
    "Gruppo",
    "Costruzioni",
    "Servizi",
    "Soluzioni",
    "Immobiliare",
    "Digitale",
  ],
  pt: [
    "Consultoria",
    "Logística",
    "Tecnologia",
    "Grupo",
    "Construções",
    "Serviços",
    "Soluções",
    "Imobiliária",
    "Digital",
  ],
  other: ["Group", "Partners", "Solutions", "Digital", "Logistics", "Consulting", "Technologies", "Systems"],
};

const BRAND_START = [
  "Nova",
  "Lumi",
  "Terra",
  "Vex",
  "Ora",
  "Zen",
  "Quanta",
  "Aero",
  "Bright",
  "Clear",
  "Blue",
  "Peak",
  "Silver",
  "North",
  "True",
  "Next",
];
const BRAND_END = [
  "ly",
  "io",
  "ix",
  "ware",
  "labs",
  "flow",
  "nest",
  "bridge",
  "point",
  "wave",
  "line",
  "stone",
  "field",
  "works",
  "hub",
];

export interface Company {
  name: string;
  baseName: string;
  legalForm: string;
  domain: string;
  website: string;
  email: string;
  phone?: string;
  phoneFictional: boolean;
  address: Address;
  vat?: string;
  registration?: Field;
  extraIds: Field[];
  iban?: string;
  bic?: string;
  bank?: string;
  /** Domestic bank details for countries that don't use IBAN. */
  bankAccount?: Field[];
}

function companyBaseName(p: Profile): string {
  const f = p.faker;
  const words = INDUSTRY_WORDS[p.language];
  const last = () => f.person.lastName();
  const and = { nl: "&", fr: "&", de: "&", en: "&", es: "y", it: "&", pt: "&", other: "&" }[p.language];
  switch (int(0, 4)) {
    case 0:
      return last();
    case 1:
      return `${last()} ${and} ${last()}`;
    case 2:
      return `${last()} ${pick(words)}`;
    case 3:
      return `${pick(BRAND_START)}${pick(BRAND_END)}`;
    default:
      return `${pick(BRAND_START)}${pick(BRAND_END)} ${pick(words)}`;
  }
}

/** Domestic company register numbers that aren't already the VAT number. */
function registration(p: Profile, vatNational: string | undefined, city: string): { primary?: Field; extra: Field[] } {
  switch (p.iso) {
    case "BE":
      return vatNational
        ? {
            primary: {
              label: "Enterprise number (KBO/BCE)",
              value: `${vatNational.slice(0, 4)}.${vatNational.slice(4, 7)}.${vatNational.slice(7)}`,
            },
            extra: [],
          }
        : { extra: [] };
    case "NL":
      return { primary: { label: "KvK number", value: nonZeroDigits(8) }, extra: [] };
    case "CH":
      return vatNational
        ? {
            primary: {
              label: "UID",
              value: `CHE-${vatNational.slice(0, 3)}.${vatNational.slice(3, 6)}.${vatNational.slice(6)}`,
            },
            extra: [],
          }
        : { extra: [] };
    case "DE":
      return {
        primary: { label: "Handelsregister", value: `HRB ${int(10000, 299999)}, Amtsgericht ${city}` },
        extra: [],
      };
    case "AT":
      return {
        primary: { label: "Firmenbuchnummer", value: `FN ${int(100000, 599999)}${letters(1).toLowerCase()}` },
        extra: [],
      };
    case "FR": {
      if (!vatNational) return { extra: [] };
      const siren = vatNational.slice(2);
      const nicBase = siren + digits(4);
      const siret = nicBase + luhnCheckDigit(nicBase);
      return { primary: { label: "SIREN", value: siren }, extra: [{ label: "SIRET", value: siret }] };
    }
    case "LU":
      return { primary: { label: "RCS number", value: `B${int(100000, 299999)}` }, extra: [] };
    case "GB":
      return { primary: { label: "Companies House number", value: "1" + digits(7) }, extra: [] };
    case "IE":
      return { primary: { label: "CRO number", value: String(int(100000, 799999)) }, extra: [] };
    case "US": {
      const e = ein();
      return { primary: { label: "EIN", value: e.formatted }, extra: [] };
    }
    case "AU": {
      const a = acn();
      const b = abnFromBody(a.compact);
      return { primary: { label: "ABN", value: b.formatted }, extra: [{ label: "ACN", value: a.formatted }] };
    }
    case "NZ":
      return { primary: { label: "NZBN", value: nzbn().compact }, extra: [] };
    case "PL":
      return { primary: { label: "KRS", value: "0000" + digits(6) }, extra: [] };
    case "HU":
      return { primary: { label: "Cégjegyzékszám", value: `01-09-${digits(6)}` }, extra: [] };
    case "RO":
      return { primary: { label: "Nr. Reg. Com.", value: `J40/${int(1000, 29999)}/${int(2005, 2024)}` }, extra: [] };
    default:
      return { extra: [] };
  }
}

export function company(p: Profile, phoneMode: PhoneMode): Company {
  const baseName = companyBaseName(p);
  const legalForm = pick(p.legalForms);
  const domainSlug = slug(baseName, "-");
  const domain = `${domainSlug}.example.com`;
  const addr = address(p);

  const vatDef = vatCountry(p.iso === "GR" ? "EL" : p.iso);
  const vat = vatDef ? generateVat(vatDef) : undefined;
  const vatNational = vat?.variants?.[0]?.value;
  const reg = registration(p, vatNational, addr.city);

  const ibanDef = ibanCountry(p.iso);
  const iban = ibanDef ? generateIban(ibanDef) : undefined;
  const domesticBank = iban ? undefined : domesticBankAccount(p.iso);
  const phone = generatePhone(p.iso, "landline", phoneMode) ?? generatePhone(p.iso, "mobile", phoneMode);

  return {
    name: `${baseName} ${legalForm}`,
    baseName,
    legalForm,
    domain,
    website: `https://www.${domain}`,
    email: `${pick(["info", "hello", "contact", "office"])}@${domain}`,
    phone: phone?.formatted,
    phoneFictional: phone?.fictional ?? false,
    address: addr,
    vat: vat?.compact,
    registration: reg.primary,
    extraIds: reg.extra,
    iban: iban?.formatted,
    bic: iban?.bic,
    bank: iban?.bankName,
    bankAccount: domesticBank,
  };
}

/** Countries without IBAN: US routing + account, AU BSB + account, NZ bank-branch-account-suffix. */
function domesticBankAccount(iso: CountryCode): Field[] | undefined {
  switch (iso) {
    case "US": {
      const routing = abaRouting();
      return [
        { label: "ABA routing number", value: routing.compact },
        { label: "Account number", value: nonZeroDigits(int(9, 12)) },
      ];
    }
    case "AU": {
      const bsb = pick(["062", "032", "082", "012"]) + digits(3);
      return [
        { label: "BSB", value: `${bsb.slice(0, 3)}-${bsb.slice(3)}` },
        { label: "Account number", value: nonZeroDigits(8) },
      ];
    }
    case "NZ": {
      const bank = pick(["01", "02", "03", "06", "12", "38"]);
      return [{ label: "Bank account", value: `${bank}-${digits(4)}-${digits(7)}-${digits(2)}` }];
    }
    default:
      return undefined;
  }
}

// --- Copy All serializers ------------------------------------------------------------

export function personToText(p: Person): string {
  return [
    p.fullName,
    `${p.sex === "female" ? "Female" : "Male"}, born ${p.birthdate}`,
    p.email,
    `Username: ${p.username}`,
    p.phone,
    p.address.multiLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export function personToJson(p: Person) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    fullName: p.fullName,
    gender: p.sex,
    birthdate: p.birthdate,
    email: p.email,
    username: p.username,
    phone: p.phone,
    address: {
      street: p.address.street,
      postcode: p.address.postcode,
      city: p.address.city,
      region: p.address.region,
      country: p.address.country,
    },
  };
}

export function companyToText(c: Company): string {
  return [
    c.name,
    c.address.multiLine,
    c.vat && `VAT: ${c.vat}`,
    c.registration && `${c.registration.label}: ${c.registration.value}`,
    ...c.extraIds.map((f) => `${f.label}: ${f.value}`),
    c.phone,
    c.email,
    c.website,
    c.iban && `IBAN: ${c.iban}`,
    c.bic && `BIC: ${c.bic}`,
    c.bank && `Bank: ${c.bank}`,
    ...(c.bankAccount ?? []).map((f) => `${f.label}: ${f.value}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Primary register number plus secondary ones (SIRET, ACN, …), keyed by their label. */
function registrationJson(c: Company): Record<string, string> | undefined {
  const ids = [...(c.registration ? [c.registration] : []), ...c.extraIds];
  return ids.length ? Object.fromEntries(ids.map((f) => [f.label, f.value])) : undefined;
}

export function companyToJson(c: Company) {
  return {
    name: c.name,
    legalForm: c.legalForm,
    vatNumber: c.vat,
    registration: registrationJson(c),
    email: c.email,
    website: c.website,
    phone: c.phone,
    address: {
      street: c.address.street,
      postcode: c.address.postcode,
      city: c.address.city,
      region: c.address.region,
      country: c.address.country,
    },
    iban: c.iban?.replace(/ /g, ""),
    bic: c.bic,
    bank: c.bank,
    bankAccount: c.bankAccount && Object.fromEntries(c.bankAccount.map((f) => [f.label, f.value])),
  };
}
