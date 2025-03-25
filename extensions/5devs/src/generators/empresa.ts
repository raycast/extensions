import { inscricoes } from "../data/inscricoes-estaduais";
import { cleanString } from "../utils/utils";

const create_array = (total: number, numero: number): number[] =>
  Array.from(Array(total), () => Math.round(Math.random() * numero));

const mod = (dividendo: number, divisor: number) => Math.round(dividendo - Math.floor(dividendo / divisor) * divisor);

export function cnpj(mask?: boolean) {
  const total_array = 8;
  const n = 9;
  const [n1, n2, n3, n4, n5, n6, n7, n8] = create_array(total_array, n);
  const n9 = 0;
  const n10 = 0;
  const n11 = 0;
  const n12 = 1;

  let d1 =
    n12 * 2 +
    n11 * 3 +
    n10 * 4 +
    n9 * 5 +
    n8! * 6 +
    n7! * 7 +
    n6! * 8 +
    n5! * 9 +
    n4! * 2 +
    n3! * 3 +
    n2! * 4 +
    n1! * 5;
  d1 = 11 - mod(d1, 11);
  if (d1 >= 10) d1 = 0;

  let d2 =
    d1 * 2 +
    n12 * 3 +
    n11 * 4 +
    n10 * 5 +
    n9 * 6 +
    n8! * 7 +
    n7! * 8 +
    n6! * 9 +
    n5! * 2 +
    n4! * 3 +
    n3! * 4 +
    n2! * 5 +
    n1! * 6;
  d2 = 11 - mod(d2, 11);
  if (d2 >= 10) d2 = 0;

  if (mask) {
    return `${n1}${n2}.${n3}${n4}${n5}.${n6}${n7}${n8}/${n9}${n10}${n11}${n12}-${d1}${d2}`;
  }

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${n10}${n11}${n12}${d1}${d2}`;
}

export function inscricaoEstadual(mask?: boolean) {
  const inscricaoEstadual = inscricoes[Math.floor(Math.random() * inscricoes.length)];

  if (mask) {
    return inscricaoEstadual;
  }

  return inscricaoEstadual?.replace(/[\\/\\.\s-]/g, "");
}

export function companyData(mask?: boolean) {
  const prefixes = ["Cia", "Grupo", "Indústria", "Comércio", "Serviços", "Consultoria"];

  const names = [
    "SVG",
    "BTC",
    "Petro",
    "Brasil",
    "Mega",
    "Global",
    "Nacional",
    "Internacional",
    "Universal",
    "Soluções",
    "Inovação",
    "AAS",
    "ABC",
    "XYZ",
    "MKT",
    "OOSS",
    "TI",
    "BYG",
    "GMBH",
    "BYD",
    "B2W",
    "B2B",
    "B2C",
    "B2G",
    "B2E",
    "B2M",
    "B2T",
    "B2P",
    "B2S",
    "B2U",
    "B2L",
    "B2J",
    "B2H",
    "PSG",
    "ATM",
    "BRA",
    "BRS",
    "BRC",
    "BRD",
    "BRE",
    "BRF",
    "BRG",
    "BRH",
    "BRM",
    "BRN",
    "BRO",
    "BRP",
    "BRQ",
    "BRR",
    "BRS",
    "BRT",
    "KSN",
    "KTM",
    "KRA",
    "KRS",
    "KRC",
    "KRD",
    "KRE",
    "KRF",
    "KRG",
    "KRH",
    "KRI",
    "KRJ",
    "KRK",
    "KRM",
    "KRN",
    "KRO",
    "KRP",
    "KRQ",
    "KRR",
    "KRN",
    "KRO",
    "KRP",
    "AAK",
    "AAM",
    "AAN",
    "AAO",
    "AAP",
    "AAQ",
    "Synergy",
    "TechInnovate",
    "Ascent",
    "Horizon",
    "Streamline",
    "Quantum",
    "Brilliance",
    "Velocity",
    "Crest",
    "Frontier",
    "Apex",
    "Meridian",
    "Everest",
    "Prism",
    "Trailblazer",
    "Zenith",
    "Radiant",
    "Elevation",
    "Aurora",
    "Pinnacle",
    "Skyline",
    "Ember",
    "Constellation",
    "Spire",
    "Vanguard",
    "Mosaic",
    "Crescent",
    "Stellar",
    "Forge",
    "Maverick",
    "Cirrus",
    "Titan",
    "Ignite",
    "Comet",
    "Nexus",
    "Avalon",
    "Solstice",
    "Quasar",
    "Meridian",
    "Vortex",
    "Stratus",
    "Cascade",
    "Polaris",
    "Orion",
    "Astra",
    "Meteor",
    "Ascent",
    "Eclipse",
    "Sirius",
    "Empyrean",
    "Zephyr",
    "Altair",
    "Circinus",
    "Lyra",
    "Pulsar",
    "Carina",
    "Deneb",
    "Rigel",
    "Cepheus",
    "Aquila",
    "Vega",
    "Columba",
    "Hercules",
    "Antares",
    "Cygnus",
    "Draco",
    "Arcturus",
    "Corvus",
    "Andromeda",
    "Regulus",
    "Lupus",
    "Ursa",
    "Procyon",
    "Camelopardalis",
    "Canis",
    "Centaurus",
    "Cetus",
    "Crux",
    "Delphinus",
    "Dorado",
    "Gemini",
    "Hydra",
    "Lepus",
    "Libra",
    "Lynx",
    "Monoceros",
    "Musca",
    "Norma",
    "Octans",
    "Pavo",
    "Perseus",
    "Phoenix",
    "Pictor",
    "Puppis",
    "Pyxis",
    "Sagitta",
    "Sagittarius",
    "Scorpius",
    "Sculptor",
    "Serpens",
    "Taurus",
    "Triangulum",
    "Vela",
    "Virgo",
    "Volans",
    "Vulpecula",
  ];

  const activities = [
    "Alimentos",
    "Bebidas",
    "Eletrodomésticos",
    "Móveis",
    "Veículos",
    "Informática",
    "Construção",
    "Farmacêutica",
    "Têxtil",
    "Vestuário",
    "Calçados",
    "Mineração",
    "Petróleo",
    "Gás",
    "Energia",
    "Telecomunicações",
    "Educação",
    "Saúde",
    "Financeira",
    "Seguros",
    "Turismo",
    "Hotelaria",
    "Eventos",
    "Publicidade",
    "Marketing",
    "Mídia",
    "Entretenimento",
    "Esportes",
    "Cultura",
    "Arte",
    "Sustentabilidade",
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const name = names[Math.floor(Math.random() * names.length)]!;
  const activity = activities[Math.floor(Math.random() * activities.length)]!;

  const showPrefix = Math.random() > 0.5;

  return {
    razaoSocial: showPrefix ? `${prefix} ${name} ${activity}` : `${name} ${activity}`,
    cnpj: cnpj(mask),
    inscricaoEstadual: inscricaoEstadual(mask)!,
    dataAbertura: dataAbertura(),
    site: site(name, activity),
    email: email(name),
  };
}

export function dataAbertura() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - Math.floor(Math.random() * 20));
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28));
  return String(date.toISOString().split("T")[0]);
}

export function site(name: string, activity: string) {
  const domain = [".com", ".com.br", ".net"];

  const domainName = domain[Math.floor(Math.random() * domain.length)];

  return `www.${name.toLowerCase()}${cleanString(activity.toLowerCase())}${domainName}`;
}

export function email(name: string) {
  const initial = [
    "contato",
    "sac",
    "atendimento",
    "financeiro",
    "comercial",
    "rh",
    "vendas",
    "suporte",
    "marketing",
    "ti",
    "administrativo",
  ];

  const initialName = initial[Math.floor(Math.random() * initial.length)];

  return `${initialName}@${name.toLowerCase()}.com.br`;
}
