export type Cluster = "americas" | "asia" | "europe" | "sea";

interface Region {
  title: string;
  /** Regional routing value used by account-v1 and match-v5. */
  cluster: Cluster;
  /** Slug used in op.gg profile URLs. */
  opgg: string;
}

/** Platform routing values (summoner-v4, league-v4) and the regional cluster each one belongs to. */
export const REGIONS = {
  tr1: { title: "Türkiye (TR)", cluster: "europe", opgg: "tr" },
  euw1: { title: "Europe West (EUW)", cluster: "europe", opgg: "euw" },
  eun1: { title: "Europe Nordic & East (EUNE)", cluster: "europe", opgg: "eune" },
  me1: { title: "Middle East (ME)", cluster: "europe", opgg: "me" },
  ru: { title: "Russia (RU)", cluster: "europe", opgg: "ru" },
  na1: { title: "North America (NA)", cluster: "americas", opgg: "na" },
  br1: { title: "Brazil (BR)", cluster: "americas", opgg: "br" },
  la1: { title: "Latin America North (LAN)", cluster: "americas", opgg: "lan" },
  la2: { title: "Latin America South (LAS)", cluster: "americas", opgg: "las" },
  kr: { title: "Korea (KR)", cluster: "asia", opgg: "kr" },
  jp1: { title: "Japan (JP)", cluster: "asia", opgg: "jp" },
  oc1: { title: "Oceania (OCE)", cluster: "sea", opgg: "oce" },
  sg2: { title: "Singapore (SG)", cluster: "sea", opgg: "sg" },
  tw2: { title: "Taiwan (TW)", cluster: "sea", opgg: "tw" },
  vn2: { title: "Vietnam (VN)", cluster: "sea", opgg: "vn" },
  ph2: { title: "Philippines (PH)", cluster: "sea", opgg: "ph" },
  th2: { title: "Thailand (TH)", cluster: "sea", opgg: "th" },
} as const satisfies Record<string, Region>;

export type Platform = keyof typeof REGIONS;

export function isPlatform(value: string): value is Platform {
  return Object.hasOwn(REGIONS, value);
}

export function clusterOf(platform: Platform): Cluster {
  return REGIONS[platform].cluster;
}

/** account-v1 is served from americas, asia and europe only. */
export function accountCluster(platform: Platform): Exclude<Cluster, "sea"> {
  const cluster = clusterOf(platform);
  return cluster === "sea" ? "asia" : cluster;
}

/** Match IDs are prefixed with the platform they were played on, e.g. `KR_8386059145`. */
export function platformOfMatchId(matchId: string): Platform | undefined {
  const prefix = matchId.split("_")[0].toLowerCase();
  return isPlatform(prefix) ? prefix : undefined;
}
