import { getPreferenceValues } from "@raycast/api";

export function getUserCountryCode(): string {
  const { countryCode } = getPreferenceValues<Preferences>();
  return (countryCode || "de").toLowerCase();
}

export function getLocale(): string {
  const { locale } = getPreferenceValues<Preferences>();
  return locale || "de-DE";
}

export function formatNumber(num: number): string {
  return num.toLocaleString(getLocale());
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(getLocale());
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString(getLocale());
}

const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  ad: "andorra",
  ae: "united-arab-emirates",
  af: "afghanistan",
  al: "albania",
  am: "armenia",
  ao: "angola",
  ar: "argentina",
  at: "austria",
  au: "australia",
  az: "azerbaijan",
  ba: "bosnia-and-herzegovina",
  bd: "bangladesh",
  be: "belgium",
  bf: "burkina-faso",
  bg: "bulgaria",
  bh: "bahrain",
  bo: "bolivia",
  br: "brazil",
  bt: "bhutan",
  bw: "botswana",
  by: "belarus",
  ca: "canada",
  cd: "democratic-republic-of-the-congo",
  cg: "republic-of-the-congo",
  ch: "switzerland",
  cl: "chile",
  cm: "cameroon",
  cn: "china",
  co: "colombia",
  cr: "costa-rica",
  cz: "czechia",
  de: "germany",
  dk: "denmark",
  do: "dominican-republic",
  dz: "algeria",
  ec: "ecuador",
  ee: "estonia",
  eg: "egypt",
  es: "spain",
  et: "ethiopia",
  fi: "finland",
  fr: "france",
  gb: "united-kingdom",
  ge: "georgia",
  gh: "ghana",
  gl: "greenland",
  gr: "greece",
  gt: "guatemala",
  hk: "hong-kong",
  hn: "honduras",
  hr: "croatia",
  hu: "hungary",
  id: "indonesia",
  ie: "ireland",
  il: "israel",
  in: "india",
  iq: "iraq",
  ir: "iran",
  is: "iceland",
  it: "italy",
  jo: "jordan",
  jp: "japan",
  ke: "kenya",
  kg: "kyrgyzstan",
  kh: "cambodia",
  kr: "south-korea",
  kw: "kuwait",
  kz: "kazakhstan",
  la: "laos",
  lb: "lebanon",
  lk: "sri-lanka",
  lt: "lithuania",
  lu: "luxembourg",
  lv: "latvia",
  ly: "libya",
  ma: "morocco",
  mc: "monaco",
  md: "moldova",
  me: "montenegro",
  mg: "madagascar",
  mk: "north-macedonia",
  mn: "mongolia",
  mt: "malta",
  mx: "mexico",
  my: "malaysia",
  mz: "mozambique",
  na: "namibia",
  ng: "nigeria",
  ni: "nicaragua",
  nl: "netherlands",
  no: "norway",
  np: "nepal",
  nz: "new-zealand",
  om: "oman",
  pa: "panama",
  pe: "peru",
  ph: "philippines",
  pk: "pakistan",
  pl: "poland",
  pr: "puerto-rico",
  pt: "portugal",
  py: "paraguay",
  qa: "qatar",
  ro: "romania",
  rs: "serbia",
  ru: "russia",
  rw: "rwanda",
  sa: "saudi-arabia",
  se: "sweden",
  sg: "singapore",
  si: "slovenia",
  sk: "slovakia",
  sn: "senegal",
  sv: "el-salvador",
  th: "thailand",
  tn: "tunisia",
  tr: "turkey",
  tw: "taiwan",
  tz: "tanzania",
  ua: "ukraine",
  ug: "uganda",
  us: "united-states",
  uy: "uruguay",
  uz: "uzbekistan",
  ve: "venezuela",
  vn: "vietnam",
  za: "south-africa",
  zm: "zambia",
  zw: "zimbabwe",
};

export function getPlonkItUrl(countryCode: string): string | null {
  const countryName = COUNTRY_CODE_TO_NAME[countryCode.toLowerCase()];
  if (!countryName) return null;
  return `https://www.plonkit.net/${countryName}`;
}
