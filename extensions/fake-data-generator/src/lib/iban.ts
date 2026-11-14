import { lettersToNumeric, luhnCheckDigit, mod, mod11_10, mod97, mod97_10, weightedSum } from "./checksum";
import { digits, int, letters, nonZeroDigits, pick, retry } from "./random";
import { Field, Generated } from "./types";

export interface Bank {
  name: string;
  /** National bank identifier as it appears at the start of the BBAN. */
  code: string;
  bic: string;
}

interface Bban {
  bban: string;
  bank?: Bank;
  fields: Field[];
}

export interface IbanCountry {
  code: string;
  name: string;
  keywords: string[];
  length: number;
  /** "4a 10n" style structure from the SWIFT IBAN registry. */
  structure: string;
  /** National check digits inside the BBAN that are also generated correctly. */
  nationalCheck?: string;
  banks?: Bank[];
  bban: () => Bban;
}

export interface Iban extends Generated {
  bic: string;
  bankName?: string;
}

const f = (label: string, value: string): Field => ({ label, value });

/** Synthetic BIC for banks we don't know. Location code "X0" ("0" in 2nd position = ISO 9362 test BIC). */
export function syntheticBic(countryCode: string): string {
  return `${letters(4)}${countryCode}${letters(1)}0`;
}

/** Simple BBANs without national check digits: segments are [label, length, "n" | "a"]. */
function plain(segments: [string, number, ("n" | "a")?][], banks?: Bank[]): () => Bban {
  return () => {
    const bank = banks ? pick(banks) : undefined;
    const fields = segments.map(([label, length, kind], i) => {
      if (i === 0 && bank) return f(label, bank.code);
      return f(label, kind === "a" ? letters(length) : digits(length));
    });
    return { bban: fields.map((x) => x.value).join(""), bank, fields };
  };
}

/** BBANs whose last 2 digits are an ISO 7064 MOD 97-10 check over the rest (BA, ME, MK, PT, RS, SI, XK). */
function mod97Bban(segments: [string, number][], banks?: Bank[]): () => Bban {
  return () => {
    const base = plain(segments, banks)();
    const check = mod97_10(base.bban);
    return { ...base, bban: base.bban + check, fields: [...base.fields, f("National check", check)] };
  };
}

// ---------------------------------------------------------------------------
// Bank tables (public bank codes + BICs) so the IBAN and BIC belong together.
// ---------------------------------------------------------------------------

const BE_BANKS: Bank[] = [
  { name: "BNP Paribas Fortis", code: "001", bic: "GEBABEBB" },
  { name: "BNP Paribas Fortis", code: "230", bic: "GEBABEBB" },
  { name: "ING Belgium", code: "310", bic: "BBRUBEBB" },
  { name: "ING Belgium", code: "363", bic: "BBRUBEBB" },
  { name: "KBC", code: "431", bic: "KREDBEBB" },
  { name: "KBC", code: "734", bic: "KREDBEBB" },
  { name: "Belfius", code: "068", bic: "GKCCBEBB" },
  { name: "Belfius", code: "091", bic: "GKCCBEBB" },
  { name: "Argenta", code: "973", bic: "ARSPBE22" },
  { name: "Crelan", code: "103", bic: "NICABEBB" },
];

const NL_BANKS: Bank[] = [
  { name: "ABN AMRO", code: "ABNA", bic: "ABNANL2A" },
  { name: "ING", code: "INGB", bic: "INGBNL2A" },
  { name: "Rabobank", code: "RABO", bic: "RABONL2U" },
  { name: "SNS Bank", code: "SNSB", bic: "SNSBNL2A" },
  { name: "ASN Bank", code: "ASNB", bic: "ASNBNL21" },
  { name: "Triodos Bank", code: "TRIO", bic: "TRIONL2U" },
  { name: "Knab", code: "KNAB", bic: "KNABNL2H" },
  { name: "bunq", code: "BUNQ", bic: "BUNQNL2A" },
  { name: "RegioBank", code: "RBRB", bic: "RBRBNL21" },
];

const DE_BANKS: Bank[] = [
  { name: "Commerzbank Köln", code: "37040044", bic: "COBADEFFXXX" },
  { name: "Deutsche Bank Berlin", code: "10070000", bic: "DEUTDEBBXXX" },
  { name: "Deutsche Bank Frankfurt", code: "50070010", bic: "DEUTDEFFXXX" },
  { name: "Postbank Berlin", code: "10010010", bic: "PBNKDEFFXXX" },
  { name: "ING-DiBa", code: "50010517", bic: "INGDDEFFXXX" },
  { name: "Stadtsparkasse München", code: "70150000", bic: "SSKMDEMMXXX" },
  { name: "DKB Deutsche Kreditbank", code: "12030000", bic: "BYLADEM1001" },
  { name: "N26", code: "10011001", bic: "NTSBDEB1XXX" },
  { name: "GLS Bank", code: "43060967", bic: "GENODEM1GLS" },
];

const FR_BANKS: Bank[] = [
  { name: "BNP Paribas", code: "30004", bic: "BNPAFRPP" },
  { name: "Société Générale", code: "30003", bic: "SOGEFRPP" },
  { name: "LCL", code: "30002", bic: "CRLYFRPP" },
  { name: "La Banque Postale", code: "20041", bic: "PSSTFRPP" },
  { name: "CIC", code: "30066", bic: "CMCIFRPP" },
  { name: "HSBC Continental Europe", code: "30056", bic: "CCFRFRPP" },
];

const ES_BANKS: Bank[] = [
  { name: "Banco Santander", code: "0049", bic: "BSCHESMM" },
  { name: "BBVA", code: "0182", bic: "BBVAESMM" },
  { name: "CaixaBank", code: "2100", bic: "CAIXESBB" },
  { name: "Banco Sabadell", code: "0081", bic: "BSABESBB" },
  { name: "Bankinter", code: "0128", bic: "BKBKESMM" },
  { name: "ING España", code: "1465", bic: "INGDESMM" },
];

const IT_BANKS: Bank[] = [
  { name: "Intesa Sanpaolo", code: "03069", bic: "BCITITMM" },
  { name: "UniCredit", code: "02008", bic: "UNCRITMM" },
  { name: "Poste Italiane (BancoPosta)", code: "07601", bic: "BPPIITRRXXX" },
];

const PT_BANKS: Bank[] = [
  { name: "Caixa Geral de Depósitos", code: "0035", bic: "CGDIPTPL" },
  { name: "Millennium BCP", code: "0033", bic: "BCOMPTPL" },
  { name: "Banco BPI", code: "0010", bic: "BBPIPTPL" },
  { name: "Santander Totta", code: "0018", bic: "TOTAPTPL" },
  { name: "Novo Banco", code: "0007", bic: "BESCPTPL" },
];

const AT_BANKS: Bank[] = [
  { name: "Erste Bank", code: "20111", bic: "GIBAATWWXXX" },
  { name: "UniCredit Bank Austria", code: "12000", bic: "BKAUATWW" },
  { name: "BAWAG", code: "14000", bic: "BAWAATWW" },
  { name: "BAWAG P.S.K.", code: "60000", bic: "OPSKATWW" },
  { name: "Raiffeisenlandesbank NÖ-Wien", code: "32000", bic: "RLNWATWW" },
];

const CH_BANKS: Bank[] = [
  { name: "UBS", code: "00230", bic: "UBSWCHZH80A" },
  { name: "PostFinance", code: "09000", bic: "POFICHBEXXX" },
  { name: "Zürcher Kantonalbank", code: "00700", bic: "ZKBKCHZZ80A" },
  { name: "Credit Suisse (UBS)", code: "04835", bic: "CRESCHZZ80A" },
];

const GB_BANKS: (Bank & { sort: string })[] = [
  { name: "NatWest", code: "NWBK", bic: "NWBKGB2L", sort: "60" },
  { name: "Barclays", code: "BARC", bic: "BARCGB22", sort: "20" },
  { name: "Lloyds Bank", code: "LOYD", bic: "LOYDGB2L", sort: "30" },
  { name: "HSBC UK", code: "HBUK", bic: "HBUKGB4B", sort: "40" },
  { name: "Monzo", code: "MONZ", bic: "MONZGB2L", sort: "040004" },
  { name: "Starling Bank", code: "SRLG", bic: "SRLGGB2L", sort: "608371" },
];

const IE_BANKS: (Bank & { sort: string })[] = [
  { name: "AIB", code: "AIBK", bic: "AIBKIE2D", sort: "93" },
  { name: "Bank of Ireland", code: "BOFI", bic: "BOFIIE2D", sort: "90" },
  { name: "PTSB", code: "IPBS", bic: "IPBSIE2D", sort: "99" },
];

const LU_BANKS: Bank[] = [
  { name: "Spuerkeess (BCEE)", code: "001", bic: "BCEELULL" },
  { name: "BIL", code: "002", bic: "BILLLULL" },
  { name: "BGL BNP Paribas", code: "003", bic: "BGLLLULL" },
];

const PL_BANKS: Bank[] = [
  { name: "PKO Bank Polski", code: "102", bic: "BPKOPLPW" },
  { name: "Bank Pekao", code: "124", bic: "PKOPPLPW" },
  { name: "mBank", code: "114", bic: "BREXPLPW" },
  { name: "ING Bank Śląski", code: "105", bic: "INGBPLPW" },
  { name: "Santander Bank Polska", code: "109", bic: "WBKPPLPP" },
];

const CZ_BANKS: Bank[] = [
  { name: "Česká spořitelna", code: "0800", bic: "GIBACZPX" },
  { name: "Komerční banka", code: "0100", bic: "KOMBCZPP" },
  { name: "ČSOB", code: "0300", bic: "CEKOCZPP" },
  { name: "Fio banka", code: "2010", bic: "FIOBCZPP" },
  { name: "Raiffeisenbank", code: "5500", bic: "RZBCCZPP" },
  { name: "Air Bank", code: "3030", bic: "AIRACZPP" },
];

const SK_BANKS: Bank[] = [
  { name: "Slovenská sporiteľňa", code: "0900", bic: "GIBASKBX" },
  { name: "VÚB banka", code: "0200", bic: "SUBASKBX" },
  { name: "Tatra banka", code: "1100", bic: "TATRSKBX" },
  { name: "ČSOB", code: "7500", bic: "CEKOSKBX" },
];

const HU_BANKS: Bank[] = [
  { name: "OTP Bank", code: "117", bic: "OTPVHUHB" },
  { name: "K&H Bank", code: "104", bic: "OKHBHUHB" },
  { name: "Raiffeisen Bank", code: "120", bic: "UBRTHUHB" },
  { name: "CIB Bank", code: "107", bic: "CIBHHUHB" },
];

const SE_BANKS: Bank[] = [
  { name: "SEB", code: "500", bic: "ESSESESS" },
  { name: "Swedbank", code: "800", bic: "SWEDSESS" },
  { name: "Handelsbanken", code: "600", bic: "HANDSESS" },
  { name: "Nordea", code: "300", bic: "NDEASESS" },
];

const FI_BANKS: Bank[] = [
  { name: "Nordea", code: "100", bic: "NDEAFIHH" },
  { name: "OP", code: "500", bic: "OKOYFIHH" },
  { name: "Danske Bank", code: "800", bic: "DABAFIHH" },
];

const EE_BANKS: Bank[] = [
  { name: "Swedbank", code: "22", bic: "HABAEE2X" },
  { name: "SEB", code: "10", bic: "EEUHEE2X" },
  { name: "LHV Pank", code: "77", bic: "LHVBEE22" },
  { name: "Luminor", code: "96", bic: "RIKOEE22" },
];

const LV_BANKS: Bank[] = [
  { name: "Swedbank", code: "HABA", bic: "HABALV22" },
  { name: "SEB banka", code: "UNLA", bic: "UNLALV2X" },
  { name: "Citadele", code: "PARX", bic: "PARXLV22" },
];

const HR_BANKS: Bank[] = [
  { name: "Zagrebačka banka", code: "2360000", bic: "ZABAHR2X" },
  { name: "Privredna banka Zagreb", code: "2340009", bic: "PBZGHR2X" },
  { name: "Erste & Steiermärkische Bank", code: "2402006", bic: "ESBCHR22" },
  { name: "Raiffeisenbank Austria", code: "2484008", bic: "RZBHHR2X" },
];

const BG_BANKS: Bank[] = [
  { name: "UniCredit Bulbank", code: "UNCR", bic: "UNCRBGSF" },
  { name: "DSK Bank", code: "STSA", bic: "STSABGSF" },
  { name: "Fibank", code: "FINV", bic: "FINVBGSF" },
  { name: "Postbank", code: "BPBI", bic: "BPBIBGSF" },
];

const RO_BANKS: Bank[] = [
  { name: "Banca Transilvania", code: "BTRL", bic: "BTRLRO22" },
  { name: "BRD Groupe Société Générale", code: "BRDE", bic: "BRDEROBU" },
  { name: "BCR", code: "RNCB", bic: "RNCBROBU" },
  { name: "ING Bank România", code: "INGB", bic: "INGBROBU" },
];

const GR_BANKS: Bank[] = [
  { name: "National Bank of Greece", code: "011", bic: "ETHNGRAA" },
  { name: "Piraeus Bank", code: "017", bic: "PIRBGRAA" },
  { name: "Eurobank", code: "026", bic: "ERBKGRAA" },
  { name: "Alpha Bank", code: "014", bic: "CRBAGRAA" },
];

const CY_BANKS: Bank[] = [
  { name: "Bank of Cyprus", code: "002", bic: "BCYPCY2N" },
  { name: "Hellenic Bank", code: "005", bic: "HEBACY2N" },
];

const MT_BANKS: Bank[] = [
  { name: "Bank of Valletta", code: "VALL", bic: "VALLMTMT" },
  { name: "HSBC Bank Malta", code: "MMEB", bic: "MMEBMTMT" },
];

const IS_BANKS: Bank[] = [
  { name: "Landsbankinn", code: "01", bic: "NBIIISRE" },
  { name: "Arion banki", code: "03", bic: "ESJAISRE" },
  { name: "Íslandsbanki", code: "05", bic: "GLITISRE" },
];

const TR_BANKS: Bank[] = [
  { name: "Ziraat Bankası", code: "00010", bic: "TCZBTR2A" },
  { name: "Garanti BBVA", code: "00062", bic: "TGBATRIS" },
  { name: "İş Bankası", code: "00064", bic: "ISBKTRIS" },
  { name: "Akbank", code: "00046", bic: "AKBKTRIS" },
  { name: "Yapı Kredi", code: "00067", bic: "YAPITRIS" },
];

const UA_BANKS: Bank[] = [
  { name: "PrivatBank", code: "305299", bic: "PBANUA2X" },
  { name: "Universal Bank (monobank)", code: "322001", bic: "UNJSUAUK" },
];

const GE_BANKS: Bank[] = [
  { name: "TBC Bank", code: "TB", bic: "TBCBGE22" },
  { name: "Bank of Georgia", code: "BG", bic: "BAGAGE22" },
];

// ---------------------------------------------------------------------------
// Country definitions
// ---------------------------------------------------------------------------

/** Spanish "dígito de control" over 10 digits. */
function esControl(value: string): string {
  const r = 11 - (weightedSum(value, [1, 2, 4, 8, 5, 10, 9, 7, 3, 6]) % 11);
  return String(r === 11 ? 0 : r === 10 ? 1 : r);
}

/** Italian / Sammarinese CIN letter over ABI + CAB + account. */
function italianCin(value: string): string {
  const odd = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
  let sum = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const index = /\d/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65;
    sum += i % 2 === 0 ? odd[index] : index;
  }
  return String.fromCharCode(65 + (sum % 26));
}

/** French / Monegasque RIB key. */
function ribKey(bank: string, branch: string, account: string): string {
  const total = 89 * Number(bank) + 15 * Number(branch) + 3 * Number(account);
  return String(97 - (total % 97)).padStart(2, "0");
}

function frenchBban(banks?: Bank[]) {
  return (): Bban => {
    const bank = banks ? pick(banks) : undefined;
    const bankCode = bank?.code ?? nonZeroDigits(5);
    const branch = digits(5);
    const account = digits(11);
    const key = ribKey(bankCode, branch, account);
    return {
      bban: bankCode + branch + account + key,
      bank,
      fields: [f("Bank code", bankCode), f("Branch code", branch), f("Account number", account), f("RIB key", key)],
    };
  };
}

function italianBban(banks?: Bank[]) {
  return (): Bban => {
    const bank = banks ? pick(banks) : undefined;
    const abi = bank?.code ?? digits(5);
    const cab = digits(5);
    const account = digits(12);
    const cin = italianCin(abi + cab + account);
    return {
      bban: cin + abi + cab + account,
      bank,
      fields: [f("CIN", cin), f("ABI (bank)", abi), f("CAB (branch)", cab), f("Account number", account)],
    };
  };
}

/** Czech / Slovak: prefix and account number each satisfy a weighted mod 11 check. */
function czechSlovakBban(banks: Bank[]) {
  return (): Bban =>
    retry(() => {
      const bank = pick(banks);
      const base = nonZeroDigits(9);
      const check = mod(-weightedSum(base, [6, 3, 7, 9, 10, 5, 8, 4, 2]), 11);
      if (check === 10) return undefined;
      const prefix = "000000";
      const account = base + check;
      return {
        bban: bank.code + prefix + account,
        bank,
        fields: [f("Bank code", bank.code), f("Prefix", prefix), f("Account number", account)],
      };
    });
}

function dkLike(): Bban {
  const bank = digits(4);
  const account = digits(10);
  return { bban: bank + account, fields: [f("Bank code (reg. no.)", bank), f("Account number", account)] };
}

/** Icelandic company kennitala (DDMMYY+40 on the day, 2 random digits, mod 11 check, century digit). */
function kennitala(): string {
  return retry(() => {
    const year = int(1970, 2015);
    const month = int(1, 12);
    const day = int(1, 28) + 40;
    const base =
      String(day).padStart(2, "0") + String(month).padStart(2, "0") + String(year % 100).padStart(2, "0") + digits(2);
    const r = weightedSum(base, [3, 2, 7, 6, 5, 4, 3, 2]) % 11;
    const check = r === 0 ? 0 : 11 - r;
    if (check === 10) return undefined;
    return base + check + (year >= 2000 ? "0" : "9");
  });
}

export const IBAN_COUNTRIES: IbanCountry[] = [
  {
    code: "AD",
    name: "Andorra",
    keywords: ["andorra"],
    length: 24,
    structure: "4n bank · 4n branch · 12c account",
    bban: plain([
      ["Bank code", 4],
      ["Branch code", 4],
      ["Account number", 12],
    ]),
  },
  {
    code: "AL",
    name: "Albania",
    keywords: ["albania", "shqipëri"],
    length: 28,
    structure: "3n bank · 4n branch · 1n check · 16c account",
    nationalCheck: "Bank/branch check digit (weights 9-7-3-1)",
    bban: () => {
      const bankBranch = digits(7);
      const check = String((10 - (weightedSum(bankBranch, [9, 7, 3, 1, 9, 7, 3]) % 10)) % 10);
      const account = digits(16);
      return {
        bban: bankBranch + check + account,
        fields: [
          f("Bank code", bankBranch.slice(0, 3)),
          f("Branch code", bankBranch.slice(3)),
          f("Check digit", check),
          f("Account number", account),
        ],
      };
    },
  },
  {
    code: "AT",
    name: "Austria",
    keywords: ["austria", "österreich", "oesterreich"],
    length: 20,
    structure: "5n bank (BLZ) · 11n account",
    banks: AT_BANKS,
    bban: plain(
      [
        ["Bank code (BLZ)", 5],
        ["Account number", 11],
      ],
      AT_BANKS,
    ),
  },
  {
    code: "BA",
    name: "Bosnia and Herzegovina",
    keywords: ["bosnia", "herzegovina", "bih"],
    length: 20,
    structure: "3n bank · 3n branch · 8n account · 2n check",
    nationalCheck: "ISO 7064 MOD 97-10",
    bban: mod97Bban([
      ["Bank code", 3],
      ["Branch code", 3],
      ["Account number", 8],
    ]),
  },
  {
    code: "BE",
    name: "Belgium",
    keywords: ["belgium", "belgië", "belgie", "belgique", "belgien"],
    length: 16,
    structure: "3n bank · 7n account · 2n check",
    nationalCheck: "Account mod 97",
    banks: BE_BANKS,
    bban: () => {
      const bank = pick(BE_BANKS);
      const account = digits(7);
      const check = String(mod97(bank.code + account) || 97).padStart(2, "0");
      return {
        bban: bank.code + account + check,
        bank,
        fields: [
          f("Bank code", bank.code),
          f("Account number", account),
          f("Check digits", check),
          f("Domestic format", `${bank.code}-${account}-${check}`),
        ],
      };
    },
  },
  {
    code: "BG",
    name: "Bulgaria",
    keywords: ["bulgaria", "българия"],
    length: 22,
    structure: "4a bank · 4n branch · 2n type · 8c account",
    banks: BG_BANKS,
    bban: plain(
      [
        ["Bank code", 4, "a"],
        ["Branch code", 4],
        ["Account type", 2],
        ["Account number", 8],
      ],
      BG_BANKS,
    ),
  },
  {
    code: "BY",
    name: "Belarus",
    keywords: ["belarus"],
    length: 28,
    structure: "4c bank · 4n balance account · 16c account",
    bban: plain([
      ["Bank code", 4, "a"],
      ["Balance account", 4],
      ["Account number", 16],
    ]),
  },
  {
    code: "CH",
    name: "Switzerland",
    keywords: ["switzerland", "schweiz", "suisse", "svizzera", "swiss"],
    length: 21,
    structure: "5n bank (IID) · 12c account",
    banks: CH_BANKS,
    bban: plain(
      [
        ["Bank code (IID)", 5],
        ["Account number", 12],
      ],
      CH_BANKS,
    ),
  },
  {
    code: "CY",
    name: "Cyprus",
    keywords: ["cyprus", "κύπρος"],
    length: 28,
    structure: "3n bank · 5n branch · 16c account",
    banks: CY_BANKS,
    bban: plain(
      [
        ["Bank code", 3],
        ["Branch code", 5],
        ["Account number", 16],
      ],
      CY_BANKS,
    ),
  },
  {
    code: "CZ",
    name: "Czechia",
    keywords: ["czech", "czechia", "česko", "cesko"],
    length: 24,
    structure: "4n bank · 6n prefix · 10n account",
    nationalCheck: "Prefix + account weighted mod 11",
    banks: CZ_BANKS,
    bban: czechSlovakBban(CZ_BANKS),
  },
  {
    code: "DE",
    name: "Germany",
    keywords: ["germany", "deutschland", "allemagne"],
    length: 22,
    structure: "8n bank (BLZ) · 10n account",
    banks: DE_BANKS,
    bban: plain(
      [
        ["Bank code (BLZ)", 8],
        ["Account number", 10],
      ],
      DE_BANKS,
    ),
  },
  {
    code: "DK",
    name: "Denmark",
    keywords: ["denmark", "danmark"],
    length: 18,
    structure: "4n bank · 9n account · 1n check",
    bban: dkLike,
  },
  {
    code: "EE",
    name: "Estonia",
    keywords: ["estonia", "eesti"],
    length: 20,
    structure: "2n bank · 2n branch · 11n account · 1n check",
    nationalCheck: "7-3-1 check digit",
    banks: EE_BANKS,
    bban: () => {
      const bank = pick(EE_BANKS);
      const account = digits(13);
      const check = String((10 - (weightedSum(account, [7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7]) % 10)) % 10);
      return {
        bban: bank.code + account + check,
        bank,
        fields: [f("Bank code", bank.code), f("Account number", account + check)],
      };
    },
  },
  {
    code: "ES",
    name: "Spain",
    keywords: ["spain", "españa", "espana", "espagne"],
    length: 24,
    structure: "4n bank · 4n branch · 2n check · 10n account",
    nationalCheck: "Two dígitos de control",
    banks: ES_BANKS,
    bban: () => {
      const bank = pick(ES_BANKS);
      const branch = digits(4);
      const account = digits(10);
      const dc = esControl("00" + bank.code + branch) + esControl(account);
      return {
        bban: bank.code + branch + dc + account,
        bank,
        fields: [
          f("Bank code", bank.code),
          f("Branch code", branch),
          f("Control digits", dc),
          f("Account number", account),
        ],
      };
    },
  },
  {
    code: "FI",
    name: "Finland",
    keywords: ["finland", "suomi"],
    length: 18,
    structure: "3n bank · 11n account (incl. check)",
    nationalCheck: "Luhn",
    banks: FI_BANKS,
    bban: () => {
      const bank = pick(FI_BANKS);
      const account = digits(10);
      const check = luhnCheckDigit(bank.code + account);
      return {
        bban: bank.code + account + check,
        bank,
        fields: [f("Bank code", bank.code), f("Account number", account + check)],
      };
    },
  },
  {
    code: "FO",
    name: "Faroe Islands",
    keywords: ["faroe", "føroyar"],
    length: 18,
    structure: "4n bank · 9n account · 1n check",
    bban: dkLike,
  },
  {
    code: "FR",
    name: "France",
    keywords: ["france", "frankrijk", "frankreich"],
    length: 27,
    structure: "5n bank · 5n branch · 11c account · 2n RIB key",
    nationalCheck: "Clé RIB",
    banks: FR_BANKS,
    bban: frenchBban(FR_BANKS),
  },
  {
    code: "GB",
    name: "United Kingdom",
    keywords: ["united kingdom", "uk", "great britain", "england", "scotland", "wales"],
    length: 22,
    structure: "4a bank · 6n sort code · 8n account",
    banks: GB_BANKS,
    bban: () => {
      const bank = pick(GB_BANKS);
      const sort = bank.sort + digits(6 - bank.sort.length);
      const account = digits(8);
      return {
        bban: bank.code + sort + account,
        bank,
        fields: [
          f("Bank code", bank.code),
          f("Sort code", `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4)}`),
          f("Account number", account),
        ],
      };
    },
  },
  {
    code: "GE",
    name: "Georgia",
    keywords: ["georgia", "sakartvelo"],
    length: 22,
    structure: "2a bank · 16n account",
    banks: GE_BANKS,
    bban: plain(
      [
        ["Bank code", 2, "a"],
        ["Account number", 16],
      ],
      GE_BANKS,
    ),
  },
  {
    code: "GI",
    name: "Gibraltar",
    keywords: ["gibraltar"],
    length: 23,
    structure: "4a bank · 15c account",
    bban: plain([
      ["Bank code", 4, "a"],
      ["Account number", 15],
    ]),
  },
  {
    code: "GL",
    name: "Greenland",
    keywords: ["greenland", "kalaallit"],
    length: 18,
    structure: "4n bank · 9n account · 1n check",
    bban: dkLike,
  },
  {
    code: "GR",
    name: "Greece",
    keywords: ["greece", "hellas", "ελλάδα"],
    length: 27,
    structure: "3n bank · 4n branch · 16c account",
    banks: GR_BANKS,
    bban: plain(
      [
        ["Bank code", 3],
        ["Branch code", 4],
        ["Account number", 16],
      ],
      GR_BANKS,
    ),
  },
  {
    code: "HR",
    name: "Croatia",
    keywords: ["croatia", "hrvatska"],
    length: 21,
    structure: "7n bank · 10n account",
    nationalCheck: "ISO 7064 MOD 11-10 (bank + account)",
    banks: HR_BANKS,
    bban: () => {
      const bank = pick(HR_BANKS);
      const base = digits(9);
      const account = base + mod11_10(base);
      return { bban: bank.code + account, bank, fields: [f("Bank code", bank.code), f("Account number", account)] };
    },
  },
  {
    code: "HU",
    name: "Hungary",
    keywords: ["hungary", "magyarország", "magyarorszag"],
    length: 28,
    structure: "3n bank · 4n branch · 1n check · 15n account · 1n check",
    nationalCheck: "9-7-3-1 check digits (branch + account)",
    banks: HU_BANKS,
    bban: () => {
      const bank = pick(HU_BANKS);
      const w = [9, 7, 3, 1, 9, 7, 3];
      const bankBranch = bank.code + digits(4);
      const c1 = String((10 - (weightedSum(bankBranch, w) % 10)) % 10);
      const account = digits(7);
      const c2 = String((10 - (weightedSum(account, w) % 10)) % 10);
      const full = `${bankBranch}${c1}${account}${c2}00000000`;
      return {
        bban: full,
        bank,
        fields: [
          f("Bank code", bank.code),
          f("Branch code", bankBranch.slice(3)),
          f("Account number", account + c2),
          f("Domestic format", `${full.slice(0, 8)}-${full.slice(8, 16)}-${full.slice(16)}`),
        ],
      };
    },
  },
  {
    code: "IE",
    name: "Ireland",
    keywords: ["ireland", "éire", "eire"],
    length: 22,
    structure: "4a bank · 6n sort code · 8n account",
    banks: IE_BANKS,
    bban: () => {
      const bank = pick(IE_BANKS);
      const sort = bank.sort + digits(4);
      const account = digits(8);
      return {
        bban: bank.code + sort + account,
        bank,
        fields: [
          f("Bank code", bank.code),
          f("Sort code", `${sort.slice(0, 2)}-${sort.slice(2, 4)}-${sort.slice(4)}`),
          f("Account number", account),
        ],
      };
    },
  },
  {
    code: "IS",
    name: "Iceland",
    keywords: ["iceland", "ísland", "island"],
    length: 26,
    structure: "4n bank · 2n type · 6n account · 10n kennitala",
    nationalCheck: "Kennitala mod 11",
    banks: IS_BANKS,
    bban: () => {
      const bank = pick(IS_BANKS);
      const branch = bank.code + digits(2);
      const type = "26";
      const account = digits(6);
      const kt = kennitala();
      return {
        bban: branch + type + account + kt,
        bank,
        fields: [
          f("Bank / branch", branch),
          f("Account type", type),
          f("Account number", account),
          f("Kennitala (owner ID)", `${kt.slice(0, 6)}-${kt.slice(6)}`),
        ],
      };
    },
  },
  {
    code: "IT",
    name: "Italy",
    keywords: ["italy", "italia", "italië"],
    length: 27,
    structure: "1a CIN · 5n ABI · 5n CAB · 12c account",
    nationalCheck: "CIN check letter",
    banks: IT_BANKS,
    bban: italianBban(IT_BANKS),
  },
  {
    code: "LI",
    name: "Liechtenstein",
    keywords: ["liechtenstein"],
    length: 21,
    structure: "5n bank · 12c account",
    bban: plain([
      ["Bank code", 5],
      ["Account number", 12],
    ]),
  },
  {
    code: "LT",
    name: "Lithuania",
    keywords: ["lithuania", "lietuva"],
    length: 20,
    structure: "5n bank · 11n account",
    bban: plain([
      ["Bank code", 5],
      ["Account number", 11],
    ]),
  },
  {
    code: "LU",
    name: "Luxembourg",
    keywords: ["luxembourg", "luxemburg", "lëtzebuerg"],
    length: 20,
    structure: "3n bank · 13c account",
    banks: LU_BANKS,
    bban: plain(
      [
        ["Bank code", 3],
        ["Account number", 13],
      ],
      LU_BANKS,
    ),
  },
  {
    code: "LV",
    name: "Latvia",
    keywords: ["latvia", "latvija"],
    length: 21,
    structure: "4a bank · 13c account",
    banks: LV_BANKS,
    bban: plain(
      [
        ["Bank code", 4, "a"],
        ["Account number", 13],
      ],
      LV_BANKS,
    ),
  },
  {
    code: "MC",
    name: "Monaco",
    keywords: ["monaco"],
    length: 27,
    structure: "5n bank · 5n branch · 11c account · 2n RIB key",
    nationalCheck: "Clé RIB",
    bban: frenchBban(),
  },
  {
    code: "MD",
    name: "Moldova",
    keywords: ["moldova"],
    length: 24,
    structure: "2c bank · 18c account",
    bban: plain([
      ["Bank code", 2, "a"],
      ["Account number", 18],
    ]),
  },
  {
    code: "ME",
    name: "Montenegro",
    keywords: ["montenegro", "crna gora"],
    length: 22,
    structure: "3n bank · 13n account · 2n check",
    nationalCheck: "ISO 7064 MOD 97-10",
    bban: mod97Bban([
      ["Bank code", 3],
      ["Account number", 13],
    ]),
  },
  {
    code: "MK",
    name: "North Macedonia",
    keywords: ["macedonia", "north macedonia"],
    length: 19,
    structure: "3n bank · 10c account · 2n check",
    nationalCheck: "ISO 7064 MOD 97-10",
    bban: mod97Bban([
      ["Bank code", 3],
      ["Account number", 10],
    ]),
  },
  {
    code: "MT",
    name: "Malta",
    keywords: ["malta"],
    length: 31,
    structure: "4a bank · 5n branch · 18c account",
    banks: MT_BANKS,
    bban: plain(
      [
        ["Bank code", 4, "a"],
        ["Branch code", 5],
        ["Account number", 18],
      ],
      MT_BANKS,
    ),
  },
  {
    code: "NL",
    name: "Netherlands",
    keywords: ["netherlands", "nederland", "holland", "pays-bas", "niederlande"],
    length: 18,
    structure: "4a bank · 10n account",
    nationalCheck: "Elfproef (mod 11)",
    banks: NL_BANKS,
    bban: () =>
      retry(() => {
        const bank = pick(NL_BANKS);
        const base = "0" + nonZeroDigits(8);
        const check = mod(-weightedSum(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]), 11);
        if (check === 10) return undefined;
        return {
          bban: bank.code + base + check,
          bank,
          fields: [f("Bank code", bank.code), f("Account number", base + check)],
        };
      }),
  },
  {
    code: "NO",
    name: "Norway",
    keywords: ["norway", "norge", "noorwegen"],
    length: 15,
    structure: "4n bank · 6n account · 1n check",
    nationalCheck: "Mod 11",
    bban: () =>
      retry(() => {
        const base = nonZeroDigits(10);
        const r = weightedSum(base, [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]) % 11;
        const check = r === 0 ? 0 : 11 - r;
        if (check === 10) return undefined;
        const bban = base + check;
        return {
          bban,
          fields: [
            f("Bank code", bban.slice(0, 4)),
            f("Account number", bban.slice(4)),
            f("Domestic format", `${bban.slice(0, 4)}.${bban.slice(4, 6)}.${bban.slice(6)}`),
          ],
        };
      }),
  },
  {
    code: "PL",
    name: "Poland",
    keywords: ["poland", "polska", "polen"],
    length: 28,
    structure: "8n bank/branch (incl. check) · 16n account",
    nationalCheck: "Bank/branch check digit",
    banks: PL_BANKS,
    bban: () => {
      const bank = pick(PL_BANKS);
      const branch = bank.code + digits(4);
      const check = String((10 - (weightedSum(branch, [3, 9, 7, 1, 3, 9, 7]) % 10)) % 10);
      const account = digits(16);
      return {
        bban: branch + check + account,
        bank,
        fields: [f("Bank/branch code", branch + check), f("Account number", account)],
      };
    },
  },
  {
    code: "PT",
    name: "Portugal",
    keywords: ["portugal"],
    length: 25,
    structure: "4n bank · 4n branch · 11n account · 2n check",
    nationalCheck: "NIB check (ISO 7064 MOD 97-10)",
    banks: PT_BANKS,
    bban: mod97Bban(
      [
        ["Bank code", 4],
        ["Branch code", 4],
        ["Account number", 11],
      ],
      PT_BANKS,
    ),
  },
  {
    code: "RO",
    name: "Romania",
    keywords: ["romania", "românia"],
    length: 24,
    structure: "4a bank · 16c account",
    banks: RO_BANKS,
    bban: plain(
      [
        ["Bank code", 4, "a"],
        ["Account number", 16],
      ],
      RO_BANKS,
    ),
  },
  {
    code: "RS",
    name: "Serbia",
    keywords: ["serbia", "srbija"],
    length: 22,
    structure: "3n bank · 13n account · 2n check",
    nationalCheck: "ISO 7064 MOD 97-10",
    bban: mod97Bban([
      ["Bank code", 3],
      ["Account number", 13],
    ]),
  },
  {
    code: "SE",
    name: "Sweden",
    keywords: ["sweden", "sverige", "zweden"],
    length: 24,
    structure: "3n bank · 16n account · 1n check",
    banks: SE_BANKS,
    bban: plain(
      [
        ["Bank code", 3],
        ["Account number", 17],
      ],
      SE_BANKS,
    ),
  },
  {
    code: "SI",
    name: "Slovenia",
    keywords: ["slovenia", "slovenija"],
    length: 19,
    structure: "5n bank/branch · 8n account · 2n check",
    nationalCheck: "ISO 7064 MOD 97-10",
    bban: mod97Bban([
      ["Bank/branch code", 5],
      ["Account number", 8],
    ]),
  },
  {
    code: "SK",
    name: "Slovakia",
    keywords: ["slovakia", "slovensko"],
    length: 24,
    structure: "4n bank · 6n prefix · 10n account",
    nationalCheck: "Prefix + account weighted mod 11",
    banks: SK_BANKS,
    bban: czechSlovakBban(SK_BANKS),
  },
  {
    code: "SM",
    name: "San Marino",
    keywords: ["san marino"],
    length: 27,
    structure: "1a CIN · 5n ABI · 5n CAB · 12c account",
    nationalCheck: "CIN check letter",
    bban: italianBban(),
  },
  {
    code: "TR",
    name: "Türkiye",
    keywords: ["turkey", "türkiye", "turkiye"],
    length: 26,
    structure: "5n bank · 1n reserved · 16c account",
    banks: TR_BANKS,
    bban: () => {
      const bank = pick(TR_BANKS);
      const account = digits(16);
      return {
        bban: bank.code + "0" + account,
        bank,
        fields: [f("Bank code", bank.code), f("Reserved", "0"), f("Account number", account)],
      };
    },
  },
  {
    code: "UA",
    name: "Ukraine",
    keywords: ["ukraine", "україна"],
    length: 29,
    structure: "6n bank (MFO) · 19c account",
    banks: UA_BANKS,
    bban: plain(
      [
        ["Bank code (MFO)", 6],
        ["Account number", 19],
      ],
      UA_BANKS,
    ),
  },
  {
    code: "VA",
    name: "Vatican City",
    keywords: ["vatican", "holy see"],
    length: 22,
    structure: "3n bank · 15n account",
    bban: plain([
      ["Bank code", 3],
      ["Account number", 15],
    ]),
  },
  {
    code: "XK",
    name: "Kosovo",
    keywords: ["kosovo"],
    length: 20,
    structure: "4n bank · 10n account · 2n check",
    nationalCheck: "ISO 7064 MOD 97-10",
    bban: mod97Bban([
      ["Bank code", 4],
      ["Account number", 10],
    ]),
  },
];

/** IBAN check digits for a country + BBAN (ISO 13616). */
export function ibanCheckDigits(countryCode: string, bban: string): string {
  return String(98 - mod97(lettersToNumeric(bban + countryCode) + "00")).padStart(2, "0");
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})(?=.)/g, "$1 ");
}

export function generateIban(country: IbanCountry): Iban {
  const { bban, bank, fields } = country.bban();
  const iban = country.code + ibanCheckDigits(country.code, bban) + bban;
  if (iban.length !== country.length) throw new Error(`Bad ${country.code} IBAN length: ${iban}`);
  const bic = bank?.bic ?? syntheticBic(country.code);
  return {
    compact: iban,
    formatted: formatIban(iban),
    bic,
    bankName: bank?.name,
    variants: [
      { label: "BBAN (domestic)", value: bban },
      { label: "BIC", value: bic },
    ],
    fields: [
      f("Country", `${country.name} (${country.code})`),
      f("Check digits", iban.slice(2, 4)),
      f("Bank", bank?.name ?? "Random (synthetic BIC)"),
      f("BIC", bic),
      ...fields,
      f("Structure", country.structure),
      f("Validation", ["ISO 13616 mod 97", country.nationalCheck].filter(Boolean).join(" + ")),
    ],
  };
}

export function ibanCountry(code: string): IbanCountry | undefined {
  return IBAN_COUNTRIES.find((c) => c.code === code);
}
