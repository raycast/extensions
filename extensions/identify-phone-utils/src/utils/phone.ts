export type CountryInfo = {
  name: string;
  flag: string;
  dialCode: string;
};

export const PHONE_PREFIXES: Record<string, CountryInfo> = {
  "1242": { name: "Bahamas", flag: "🇧🇸", dialCode: "+1242" },
  "1246": { name: "Barbados", flag: "🇧🇧", dialCode: "+1246" },
  "1264": { name: "Anguilla", flag: "🇦🇮", dialCode: "+1264" },
  "1268": { name: "Antigua and Barbuda", flag: "🇦🇬", dialCode: "+1268" },
  "1284": { name: "British Virgin Islands", flag: "🇻🇬", dialCode: "+1284" },
  "1340": { name: "US Virgin Islands", flag: "🇻🇮", dialCode: "+1340" },
  "1345": { name: "Cayman Islands", flag: "🇰🇾", dialCode: "+1345" },
  "1441": { name: "Bermuda", flag: "🇧🇲", dialCode: "+1441" },
  "1473": { name: "Grenada", flag: "🇬🇩", dialCode: "+1473" },
  "1649": { name: "Turks and Caicos Islands", flag: "🇹🇨", dialCode: "+1649" },
  "1664": { name: "Montserrat", flag: "🇲🇸", dialCode: "+1664" },
  "1670": { name: "Northern Mariana Islands", flag: "🇲🇵", dialCode: "+1670" },
  "1671": { name: "Guam", flag: "🇬🇺", dialCode: "+1671" },
  "1684": { name: "American Samoa", flag: "🇦🇸", dialCode: "+1684" },
  "1721": { name: "Sint Maarten", flag: "🇸🇽", dialCode: "+1721" },
  "1758": { name: "Saint Lucia", flag: "🇱🇨", dialCode: "+1758" },
  "1767": { name: "Dominica", flag: "🇩🇲", dialCode: "+1767" },
  "1784": { name: "Saint Vincent and the Grenadines", flag: "🇻🇨", dialCode: "+1784" },
  "1787": { name: "Puerto Rico", flag: "🇵🇷", dialCode: "+1787" },
  "1809": { name: "Dominican Republic", flag: "🇩🇴", dialCode: "+1809" },
  "1829": { name: "Dominican Republic", flag: "🇩🇴", dialCode: "+1829" },
  "1849": { name: "Dominican Republic", flag: "🇩🇴", dialCode: "+1849" },
  "1868": { name: "Trinidad and Tobago", flag: "🇹🇹", dialCode: "+1868" },
  "1869": { name: "Saint Kitts and Nevis", flag: "🇰🇳", dialCode: "+1869" },
  "1876": { name: "Jamaica", flag: "🇯🇲", dialCode: "+1876" },
  "1939": { name: "Puerto Rico", flag: "🇵🇷", dialCode: "+1939" },
  "1": { name: "United States / Canada", flag: "🇺🇸", dialCode: "+1" },
  "7": { name: "Russia / Kazakhstan", flag: "🇷🇺", dialCode: "+7" },
  "20": { name: "Egypt", flag: "🇪🇬", dialCode: "+20" },
  "27": { name: "South Africa", flag: "🇿🇦", dialCode: "+27" },
  "30": { name: "Greece", flag: "🇬🇷", dialCode: "+30" },
  "31": { name: "Netherlands", flag: "🇳🇱", dialCode: "+31" },
  "32": { name: "Belgium", flag: "🇧🇪", dialCode: "+32" },
  "33": { name: "France", flag: "🇫🇷", dialCode: "+33" },
  "34": { name: "Spain", flag: "🇪🇸", dialCode: "+34" },
  "36": { name: "Hungary", flag: "🇭🇺", dialCode: "+36" },
  "39": { name: "Italy", flag: "🇮🇹", dialCode: "+39" },
  "40": { name: "Romania", flag: "🇷🇴", dialCode: "+40" },
  "41": { name: "Switzerland", flag: "🇨🇭", dialCode: "+41" },
  "43": { name: "Austria", flag: "🇦🇹", dialCode: "+43" },
  "44": { name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  "45": { name: "Denmark", flag: "🇩🇰", dialCode: "+45" },
  "46": { name: "Sweden", flag: "🇸🇪", dialCode: "+46" },
  "47": { name: "Norway", flag: "🇳🇴", dialCode: "+47" },
  "48": { name: "Poland", flag: "🇵🇱", dialCode: "+48" },
  "49": { name: "Germany", flag: "🇩🇪", dialCode: "+49" },
  "51": { name: "Peru", flag: "🇵🇪", dialCode: "+51" },
  "52": { name: "Mexico", flag: "🇲🇽", dialCode: "+52" },
  "53": { name: "Cuba", flag: "🇨🇺", dialCode: "+53" },
  "54": { name: "Argentina", flag: "🇦🇷", dialCode: "+54" },
  "55": { name: "Brazil", flag: "🇧🇷", dialCode: "+55" },
  "56": { name: "Chile", flag: "🇨🇱", dialCode: "+56" },
  "57": { name: "Colombia", flag: "🇨🇴", dialCode: "+57" },
  "58": { name: "Venezuela", flag: "🇻🇪", dialCode: "+58" },
  "60": { name: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
  "61": { name: "Australia", flag: "🇦🇺", dialCode: "+61" },
  "62": { name: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
  "63": { name: "Philippines", flag: "🇵🇭", dialCode: "+63" },
  "64": { name: "New Zealand", flag: "🇳🇿", dialCode: "+64" },
  "65": { name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
  "66": { name: "Thailand", flag: "🇹🇭", dialCode: "+66" },
  "81": { name: "Japan", flag: "🇯🇵", dialCode: "+81" },
  "82": { name: "South Korea", flag: "🇰🇷", dialCode: "+82" },
  "84": { name: "Vietnam", flag: "🇻🇳", dialCode: "+84" },
  "86": { name: "China", flag: "🇨🇳", dialCode: "+86" },
  "90": { name: "Turkey", flag: "🇹🇷", dialCode: "+90" },
  "91": { name: "India", flag: "🇮🇳", dialCode: "+91" },
  "92": { name: "Pakistan", flag: "🇵🇰", dialCode: "+92" },
  "93": { name: "Afghanistan", flag: "🇦🇫", dialCode: "+93" },
  "94": { name: "Sri Lanka", flag: "🇱🇰", dialCode: "+94" },
  "95": { name: "Myanmar", flag: "🇲🇲", dialCode: "+95" },
  "98": { name: "Iran", flag: "🇮🇷", dialCode: "+98" },
  "212": { name: "Morocco", flag: "🇲🇦", dialCode: "+212" },
  "213": { name: "Algeria", flag: "🇩🇿", dialCode: "+213" },
  "216": { name: "Tunisia", flag: "🇹🇳", dialCode: "+216" },
  "218": { name: "Libya", flag: "🇱🇾", dialCode: "+218" },
  "220": { name: "Gambia", flag: "🇬🇲", dialCode: "+220" },
  "221": { name: "Senegal", flag: "🇸🇳", dialCode: "+221" },
  "222": { name: "Mauritania", flag: "🇲🇷", dialCode: "+222" },
  "223": { name: "Mali", flag: "🇲🇱", dialCode: "+223" },
  "224": { name: "Guinea", flag: "🇬🇳", dialCode: "+224" },
  "225": { name: "Ivory Coast", flag: "🇨🇮", dialCode: "+225" },
  "226": { name: "Burkina Faso", flag: "🇧🇫", dialCode: "+226" },
  "227": { name: "Niger", flag: "🇳🇪", dialCode: "+227" },
  "228": { name: "Togo", flag: "🇹🇬", dialCode: "+228" },
  "229": { name: "Benin", flag: "🇧🇯", dialCode: "+229" },
  "230": { name: "Mauritius", flag: "🇲🇺", dialCode: "+230" },
  "231": { name: "Liberia", flag: "🇱🇷", dialCode: "+231" },
  "232": { name: "Sierra Leone", flag: "🇸🇱", dialCode: "+232" },
  "233": { name: "Ghana", flag: "🇬🇭", dialCode: "+233" },
  "234": { name: "Nigeria", flag: "🇳🇬", dialCode: "+234" },
  "235": { name: "Chad", flag: "🇹🇩", dialCode: "+235" },
  "236": { name: "Central African Republic", flag: "🇨🇫", dialCode: "+236" },
  "237": { name: "Cameroon", flag: "🇨🇲", dialCode: "+237" },
  "238": { name: "Cape Verde", flag: "🇨🇻", dialCode: "+238" },
  "239": { name: "Sao Tome and Principe", flag: "🇸🇹", dialCode: "+239" },
  "240": { name: "Equatorial Guinea", flag: "🇬🇶", dialCode: "+240" },
  "241": { name: "Gabon", flag: "🇬🇦", dialCode: "+241" },
  "242": { name: "Republic of Congo", flag: "🇨🇬", dialCode: "+242" },
  "243": { name: "DR Congo", flag: "🇨🇩", dialCode: "+243" },
  "244": { name: "Angola", flag: "🇦🇴", dialCode: "+244" },
  "245": { name: "Guinea-Bissau", flag: "🇬🇼", dialCode: "+245" },
  "246": { name: "British Indian Ocean Territory", flag: "🇮🇴", dialCode: "+246" },
  "247": { name: "Ascension Island", flag: "🇦🇨", dialCode: "+247" },
  "248": { name: "Seychelles", flag: "🇸🇨", dialCode: "+248" },
  "249": { name: "Sudan", flag: "🇸🇩", dialCode: "+249" },
  "250": { name: "Rwanda", flag: "🇷🇼", dialCode: "+250" },
  "251": { name: "Ethiopia", flag: "🇪🇹", dialCode: "+251" },
  "252": { name: "Somalia", flag: "🇸🇴", dialCode: "+252" },
  "253": { name: "Djibouti", flag: "🇩🇯", dialCode: "+253" },
  "254": { name: "Kenya", flag: "🇰🇪", dialCode: "+254" },
  "255": { name: "Tanzania", flag: "🇹🇿", dialCode: "+255" },
  "256": { name: "Uganda", flag: "🇺🇬", dialCode: "+256" },
  "257": { name: "Burundi", flag: "🇧🇮", dialCode: "+257" },
  "258": { name: "Mozambique", flag: "🇲🇿", dialCode: "+258" },
  "260": { name: "Zambia", flag: "🇿🇲", dialCode: "+260" },
  "261": { name: "Madagascar", flag: "🇲🇬", dialCode: "+261" },
  "262": { name: "Reunion", flag: "🇷🇪", dialCode: "+262" },
  "263": { name: "Zimbabwe", flag: "🇿🇼", dialCode: "+263" },
  "264": { name: "Namibia", flag: "🇳🇦", dialCode: "+264" },
  "265": { name: "Malawi", flag: "🇲🇼", dialCode: "+265" },
  "266": { name: "Lesotho", flag: "🇱🇸", dialCode: "+266" },
  "267": { name: "Botswana", flag: "🇧🇼", dialCode: "+267" },
  "268": { name: "Eswatini", flag: "🇸🇿", dialCode: "+268" },
  "269": { name: "Comoros", flag: "🇰🇲", dialCode: "+269" },
  "290": { name: "Saint Helena", flag: "🇸🇭", dialCode: "+290" },
  "291": { name: "Eritrea", flag: "🇪🇷", dialCode: "+291" },
  "297": { name: "Aruba", flag: "🇦🇼", dialCode: "+297" },
  "298": { name: "Faroe Islands", flag: "🇫🇴", dialCode: "+298" },
  "299": { name: "Greenland", flag: "🇬🇱", dialCode: "+299" },
  "350": { name: "Gibraltar", flag: "🇬🇮", dialCode: "+350" },
  "351": { name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
  "352": { name: "Luxembourg", flag: "🇱🇺", dialCode: "+352" },
  "353": { name: "Ireland", flag: "🇮🇪", dialCode: "+353" },
  "354": { name: "Iceland", flag: "🇮🇸", dialCode: "+354" },
  "355": { name: "Albania", flag: "🇦🇱", dialCode: "+355" },
  "356": { name: "Malta", flag: "🇲🇹", dialCode: "+356" },
  "357": { name: "Cyprus", flag: "🇨🇾", dialCode: "+357" },
  "358": { name: "Finland", flag: "🇫🇮", dialCode: "+358" },
  "359": { name: "Bulgaria", flag: "🇧🇬", dialCode: "+359" },
  "370": { name: "Lithuania", flag: "🇱🇹", dialCode: "+370" },
  "371": { name: "Latvia", flag: "🇱🇻", dialCode: "+371" },
  "372": { name: "Estonia", flag: "🇪🇪", dialCode: "+372" },
  "373": { name: "Moldova", flag: "🇲🇩", dialCode: "+373" },
  "374": { name: "Armenia", flag: "🇦🇲", dialCode: "+374" },
  "375": { name: "Belarus", flag: "🇧🇾", dialCode: "+375" },
  "376": { name: "Andorra", flag: "🇦🇩", dialCode: "+376" },
  "377": { name: "Monaco", flag: "🇲🇨", dialCode: "+377" },
  "378": { name: "San Marino", flag: "🇸🇲", dialCode: "+378" },
  "379": { name: "Vatican City", flag: "🇻🇦", dialCode: "+379" },
  "380": { name: "Ukraine", flag: "🇺🇦", dialCode: "+380" },
  "381": { name: "Serbia", flag: "🇷🇸", dialCode: "+381" },
  "382": { name: "Montenegro", flag: "🇲🇪", dialCode: "+382" },
  "383": { name: "Kosovo", flag: "🇽🇰", dialCode: "+383" },
  "385": { name: "Croatia", flag: "🇭🇷", dialCode: "+385" },
  "386": { name: "Slovenia", flag: "🇸🇮", dialCode: "+386" },
  "387": { name: "Bosnia and Herzegovina", flag: "🇧🇦", dialCode: "+387" },
  "389": { name: "North Macedonia", flag: "🇲🇰", dialCode: "+389" },
  "420": { name: "Czech Republic", flag: "🇨🇿", dialCode: "+420" },
  "421": { name: "Slovakia", flag: "🇸🇰", dialCode: "+421" },
  "423": { name: "Liechtenstein", flag: "🇱🇮", dialCode: "+423" },
  "500": { name: "Falkland Islands", flag: "🇫🇰", dialCode: "+500" },
  "501": { name: "Belize", flag: "🇧🇿", dialCode: "+501" },
  "502": { name: "Guatemala", flag: "🇬🇹", dialCode: "+502" },
  "503": { name: "El Salvador", flag: "🇸🇻", dialCode: "+503" },
  "504": { name: "Honduras", flag: "🇭🇳", dialCode: "+504" },
  "505": { name: "Nicaragua", flag: "🇳🇮", dialCode: "+505" },
  "506": { name: "Costa Rica", flag: "🇨🇷", dialCode: "+506" },
  "507": { name: "Panama", flag: "🇵🇦", dialCode: "+507" },
  "508": { name: "Saint Pierre and Miquelon", flag: "🇵🇲", dialCode: "+508" },
  "509": { name: "Haiti", flag: "🇭🇹", dialCode: "+509" },
  "590": { name: "Guadeloupe", flag: "🇬🇵", dialCode: "+590" },
  "591": { name: "Bolivia", flag: "🇧🇴", dialCode: "+591" },
  "592": { name: "Guyana", flag: "🇬🇾", dialCode: "+592" },
  "593": { name: "Ecuador", flag: "🇪🇨", dialCode: "+593" },
  "594": { name: "French Guiana", flag: "🇬🇫", dialCode: "+594" },
  "595": { name: "Paraguay", flag: "🇵🇾", dialCode: "+595" },
  "596": { name: "Martinique", flag: "🇲🇶", dialCode: "+596" },
  "597": { name: "Suriname", flag: "🇸🇷", dialCode: "+597" },
  "598": { name: "Uruguay", flag: "🇺🇾", dialCode: "+598" },
  "599": { name: "Curacao", flag: "🇨🇼", dialCode: "+599" },
  "670": { name: "East Timor", flag: "🇹🇱", dialCode: "+670" },
  "672": { name: "Norfolk Island", flag: "🇳🇫", dialCode: "+672" },
  "673": { name: "Brunei", flag: "🇧🇳", dialCode: "+673" },
  "674": { name: "Nauru", flag: "🇳🇷", dialCode: "+674" },
  "675": { name: "Papua New Guinea", flag: "🇵🇬", dialCode: "+675" },
  "676": { name: "Tonga", flag: "🇹🇴", dialCode: "+676" },
  "677": { name: "Solomon Islands", flag: "🇸🇧", dialCode: "+677" },
  "678": { name: "Vanuatu", flag: "🇻🇺", dialCode: "+678" },
  "679": { name: "Fiji", flag: "🇫🇯", dialCode: "+679" },
  "680": { name: "Palau", flag: "🇵🇼", dialCode: "+680" },
  "681": { name: "Wallis and Futuna", flag: "🇼🇫", dialCode: "+681" },
  "682": { name: "Cook Islands", flag: "🇨🇰", dialCode: "+682" },
  "683": { name: "Niue", flag: "🇳🇺", dialCode: "+683" },
  "685": { name: "Samoa", flag: "🇼🇸", dialCode: "+685" },
  "686": { name: "Kiribati", flag: "🇰🇮", dialCode: "+686" },
  "687": { name: "New Caledonia", flag: "🇳🇨", dialCode: "+687" },
  "688": { name: "Tuvalu", flag: "🇹🇻", dialCode: "+688" },
  "689": { name: "French Polynesia", flag: "🇵🇫", dialCode: "+689" },
  "690": { name: "Tokelau", flag: "🇹🇰", dialCode: "+690" },
  "691": { name: "Micronesia", flag: "🇫🇲", dialCode: "+691" },
  "692": { name: "Marshall Islands", flag: "🇲🇭", dialCode: "+692" },
  "850": { name: "North Korea", flag: "🇰🇵", dialCode: "+850" },
  "852": { name: "Hong Kong", flag: "🇭🇰", dialCode: "+852" },
  "853": { name: "Macao", flag: "🇲🇴", dialCode: "+853" },
  "855": { name: "Cambodia", flag: "🇰🇭", dialCode: "+855" },
  "856": { name: "Laos", flag: "🇱🇦", dialCode: "+856" },
  "880": { name: "Bangladesh", flag: "🇧🇩", dialCode: "+880" },
  "886": { name: "Taiwan", flag: "🇹🇼", dialCode: "+886" },
  "960": { name: "Maldives", flag: "🇲🇻", dialCode: "+960" },
  "961": { name: "Lebanon", flag: "🇱🇧", dialCode: "+961" },
  "962": { name: "Jordan", flag: "🇯🇴", dialCode: "+962" },
  "963": { name: "Syria", flag: "🇸🇾", dialCode: "+963" },
  "964": { name: "Iraq", flag: "🇮🇶", dialCode: "+964" },
  "965": { name: "Kuwait", flag: "🇰🇼", dialCode: "+965" },
  "966": { name: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" },
  "967": { name: "Yemen", flag: "🇾🇪", dialCode: "+967" },
  "968": { name: "Oman", flag: "🇴🇲", dialCode: "+968" },
  "970": { name: "Palestinian Territory", flag: "🇵🇸", dialCode: "+970" },
  "971": { name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  "972": { name: "Israel", flag: "🇮🇱", dialCode: "+972" },
  "973": { name: "Bahrain", flag: "🇧🇭", dialCode: "+973" },
  "974": { name: "Qatar", flag: "🇶🇦", dialCode: "+974" },
  "975": { name: "Bhutan", flag: "🇧🇹", dialCode: "+975" },
  "976": { name: "Mongolia", flag: "🇲🇳", dialCode: "+976" },
  "977": { name: "Nepal", flag: "🇳🇵", dialCode: "+977" },
  "992": { name: "Tajikistan", flag: "🇹🇯", dialCode: "+992" },
  "993": { name: "Turkmenistan", flag: "🇹🇲", dialCode: "+993" },
  "994": { name: "Azerbaijan", flag: "🇦🇿", dialCode: "+994" },
  "995": { name: "Georgia", flag: "🇬🇪", dialCode: "+995" },
  "996": { name: "Kyrgyzstan", flag: "🇰🇬", dialCode: "+996" },
  "998": { name: "Uzbekistan", flag: "🇺🇿", dialCode: "+998" },
};

/**
 * Identify the country for a phone number using longest-prefix-wins (ITU-T E.164).
 * Accepts any format: +33 6 12 34 56 78, 0033612345678, (212) 555-1234, etc.
 */
export function identifyPhonePrefix(input: string): CountryInfo | null {
  // Strip non-digits; normalise leading "00" international exit code
  let digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  for (let len = 4; len >= 1; len--) {
    const prefix = digits.slice(0, len);
    if (prefix.length === len && PHONE_PREFIXES[prefix]) {
      return PHONE_PREFIXES[prefix];
    }
  }
  return null;
}

/**
 * Strip spaces, dashes, dots, and parentheses from a phone number.
 * Preserves a leading "+" if present.
 */
export function stripFormatting(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Format a phone number as a US number: (XXX) XXX-XXXX or +1 (XXX) XXX-XXXX.
 * Returns null when the number cannot be identified as a 10 or 11-digit US/Canada number.
 */
export function formatAsUS(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    const local = digits.slice(1);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }

  return null;
}

/**
 * Normalize a phone number to E.164 format (+digits).
 * Accepts leading "00" as international prefix.
 * Returns null if the number has no leading "+", digit count outside [7,15],
 * or if the prefix cannot be identified.
 */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  const normalized = trimmed.startsWith("00") ? "+" + trimmed.slice(2) : trimmed;
  if (!normalized.startsWith("+")) return null;
  const digits = normalized.slice(1).replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (!identifyPhonePrefix("+" + digits)) return null;
  return "+" + digits;
}

/**
 * Normalize a phone number to RFC 3966 format (tel:+digits).
 * Returns null if toE164 returns null.
 */
export function toRFC3966(input: string): string | null {
  const e164 = toE164(input);
  return e164 ? "tel:" + e164 : null;
}

/**
 * Extract all plausible phone numbers from a block of text.
 * Returns raw matched strings (not normalized).
 */
export function extractPhoneNumbers(text: string): string[] {
  const candidates = text.match(/(?:\+|00)?(?:\d[\s.\-()]{0,2}){7,15}\d/g) ?? [];
  return candidates.filter((candidate) => {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return false;
    if (candidate.trimStart().startsWith("+") || candidate.trimStart().startsWith("00")) return true;
    return digits.length >= 10 && digits.length <= 11;
  });
}

/**
 * Search countries by name or dial code.
 * Empty query returns all entries sorted by dialCode.
 * Non-empty query scores: 3=exact dial code, 2=name starts with, 1=contains.
 */
export function searchCountries(query: string): Array<{ key: string; info: CountryInfo }> {
  const q = query.replace(/^\+/, "").toLowerCase().trim();

  const entries = Object.entries(PHONE_PREFIXES).map(([key, info]) => ({ key, info }));

  if (!q) {
    return entries.sort((a, b) => a.info.dialCode.localeCompare(b.info.dialCode));
  }

  const scored = entries
    .map((entry) => {
      const name = entry.info.name.toLowerCase();
      const dialCode = entry.info.dialCode.replace("+", "");
      let score = 0;
      if (dialCode === q) score = 3;
      else if (name.startsWith(q)) score = 2;
      else if (name.includes(q) || dialCode.includes(q)) score = 1;
      return { ...entry, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.info.dialCode.localeCompare(b.info.dialCode));

  return scored.map(({ key, info }) => ({ key, info }));
}
