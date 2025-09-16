import { Clipboard, showHUD } from "@raycast/api";

// Array with current unavailable/free BE bank codes (extracted 02/2019)
// Full list: https://www.nbb.be/nl/betalingen-en-effecten/betalingsstandaarden/bankidentificatiecodes
const invalidBankCodes = [
  "112",
  "115",
  "116",
  "117",
  "118",
  "128",
  "130",
  "135",
  "136",
  "138",
  "139",
  "151",
  "152",
  "153",
  "154",
  "155",
  "156",
  "157",
  "158",
  "159",
  "160",
  "161",
  "162",
  "163",
  "164",
  "165",
  "166",
  "167",
  "168",
  "169",
  "170",
  "174",
  "177",
  "180",
  "181",
  "182",
  "184",
  "186",
  "187",
  "188",
  "215",
  "216",
  "217",
  "218",
  "219",
  "502",
  "503",
  "505",
  "506",
  "511",
  "516",
  "518",
  "520",
  "526",
  "527",
  "528",
  "529",
  "531",
  "532",
  "533",
  "534",
  "545",
  "547",
  "561",
  "580",
  "580",
  "582",
  "589",
  "602",
  "603",
  "604",
  "606",
  "608",
  "614",
  "615",
  "616",
  "617",
  "618",
  "619",
  "620",
  "621",
  "622",
  "623",
  "626",
  "627",
  "628",
  "629",
  "632",
  "633",
  "637",
  "641",
  "648",
  "653",
  "655",
  "656",
  "659",
  "660",
  "661",
  "662",
  "665",
  "667",
  "681",
  "684",
  "689",
  "690",
  "691",
  "692",
  "695",
  "697",
  "699",
  "710",
  "711",
  "712",
  "713",
  "714",
  "715",
  "716",
  "717",
  "718",
  "720",
  "721",
  "723",
  "724",
  "818",
  "819",
  "820",
  "821",
  "822",
  "827",
  "829",
  "841",
  "842",
  "843",
  "846",
  "847",
  "848",
  "849",
  "854",
  "855",
  "856",
  "857",
  "858",
  "861",
  "864",
  "867",
  "868",
  "869",
  "870",
  "874",
  "875",
  "900",
  "901",
  "902",
  "903",
  "904",
  "905",
  "907",
  "909",
  "918",
  "919",
  "927",
  "946",
  "947",
  "948",
  "962",
  "964",
  "965",
  "966",
  "967",
  "970",
  "971",
  "972",
  "974",
  "977",
  "990",
  "991",
  "992",
  "993",
  "994",
  "995",
  "996",
  "997",
  "998",
  "999",
];

function addBbanCheckDigits(bban: string) {
  const bbanInt = BigInt(bban);
  const checkDigits = bbanInt % BigInt(97);

  if (checkDigits === BigInt(0)) {
    return "X";
  } else if (checkDigits < BigInt(10)) {
    // Return the result as a string with leading zero
    return bban + "0" + checkDigits;
  } else {
    // Return the result as a string
    return bban + checkDigits;
  }
}

function generateIban(): string {
  let validNumber = false;
  let iban = "";

  while (!validNumber) {
    const randomNum = Math.random() * (9999999999 - 10000000 + 1);
    const lastDigits = (Math.floor(randomNum) + 10000000).toString();
    const firstTenDigits = "0".repeat(10 - lastDigits.length).concat(lastDigits);
    const firstThreeDigits = firstTenDigits.substr(0, 3);

    if (invalidBankCodes.includes(firstThreeDigits)) continue;

    const bbanString = addBbanCheckDigits(firstTenDigits).toString();
    if (bbanString === "X") continue;

    const bbanWithCountryCodeAndZeroes = BigInt(bbanString + "111400");
    const checkMod97 = bbanWithCountryCodeAndZeroes % BigInt(97);

    if (checkMod97 === BigInt(0)) continue;

    const ibanCheckDigits = (BigInt(98) - checkMod97).toString();
    const checkDigitsWithLeadingZeroes = "0".repeat(2 - ibanCheckDigits.length) + ibanCheckDigits;

    // Return the IBAN number in BEXX XXXX XXXX XXXX format
    iban = `BE${checkDigitsWithLeadingZeroes} ${bbanString.substr(0, 4)} ${bbanString.substr(
      4,
      4,
    )} ${bbanString.substr(8, 4)}`;
    validNumber = true;
  }

  return iban;
}

export default async (): Promise<void> => {
  const IBAN = generateIban();
  await Clipboard.copy(IBAN);
  await showHUD(`✅ IBAN ${IBAN} copied to clipboard`);
};
