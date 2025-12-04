export interface GCPRegion {
  readonly name: string;
  readonly description: string;
  readonly tier: "premium" | "standard";
  readonly continent: "na" | "eu" | "asia" | "au" | "sa" | "africa" | "me";
}

export const GCP_REGIONS: GCPRegion[] = [
  { name: "us-central1", description: "Council Bluffs, Iowa, USA", tier: "premium", continent: "na" },
  { name: "us-east1", description: "Moncks Corner, South Carolina, USA", tier: "premium", continent: "na" },
  { name: "us-east4", description: "Ashburn, Virginia, USA", tier: "premium", continent: "na" },
  { name: "us-east5", description: "Columbus, Ohio, USA", tier: "premium", continent: "na" },
  { name: "us-south1", description: "Dallas, Texas, USA", tier: "premium", continent: "na" },
  { name: "us-west1", description: "The Dalles, Oregon, USA", tier: "premium", continent: "na" },
  { name: "us-west2", description: "Los Angeles, California, USA", tier: "premium", continent: "na" },
  { name: "us-west3", description: "Salt Lake City, Utah, USA", tier: "premium", continent: "na" },
  { name: "us-west4", description: "Las Vegas, Nevada, USA", tier: "premium", continent: "na" },
  { name: "northamerica-northeast1", description: "Montreal, Quebec, Canada", tier: "premium", continent: "na" },
  { name: "northamerica-northeast2", description: "Toronto, Ontario, Canada", tier: "premium", continent: "na" },

  { name: "southamerica-east1", description: "Osasco, São Paulo, Brazil", tier: "standard", continent: "sa" },
  { name: "southamerica-west1", description: "Santiago, Chile", tier: "standard", continent: "sa" },

  { name: "europe-central2", description: "Warsaw, Poland", tier: "standard", continent: "eu" },
  { name: "europe-north1", description: "Hamina, Finland", tier: "premium", continent: "eu" },
  { name: "europe-southwest1", description: "Madrid, Spain", tier: "standard", continent: "eu" },
  { name: "europe-west1", description: "St. Ghislain, Belgium", tier: "premium", continent: "eu" },
  { name: "europe-west2", description: "London, England, UK", tier: "premium", continent: "eu" },
  { name: "europe-west3", description: "Frankfurt, Germany", tier: "premium", continent: "eu" },
  { name: "europe-west4", description: "Eemshaven, Netherlands", tier: "premium", continent: "eu" },
  { name: "europe-west6", description: "Zurich, Switzerland", tier: "premium", continent: "eu" },
  { name: "europe-west8", description: "Milan, Italy", tier: "standard", continent: "eu" },
  { name: "europe-west9", description: "Paris, France", tier: "standard", continent: "eu" },
  { name: "europe-west10", description: "Berlin, Germany", tier: "standard", continent: "eu" },
  { name: "europe-west12", description: "Turin, Italy", tier: "standard", continent: "eu" },

  { name: "asia-east1", description: "Changhua County, Taiwan", tier: "premium", continent: "asia" },
  { name: "asia-east2", description: "Hong Kong", tier: "premium", continent: "asia" },
  { name: "asia-northeast1", description: "Tokyo, Japan", tier: "premium", continent: "asia" },
  { name: "asia-northeast2", description: "Osaka, Japan", tier: "premium", continent: "asia" },
  { name: "asia-northeast3", description: "Seoul, South Korea", tier: "premium", continent: "asia" },
  { name: "asia-south1", description: "Mumbai, India", tier: "standard", continent: "asia" },
  { name: "asia-south2", description: "Delhi, India", tier: "standard", continent: "asia" },
  { name: "asia-southeast1", description: "Jurong West, Singapore", tier: "premium", continent: "asia" },
  { name: "asia-southeast2", description: "Jakarta, Indonesia", tier: "standard", continent: "asia" },

  { name: "australia-southeast1", description: "Sydney, Australia", tier: "standard", continent: "au" },
  { name: "australia-southeast2", description: "Melbourne, Australia", tier: "standard", continent: "au" },

  { name: "me-west1", description: "Tel Aviv, Israel", tier: "standard", continent: "me" },
  { name: "me-central1", description: "Doha, Qatar", tier: "standard", continent: "me" },
  { name: "me-central2", description: "Dammam, Saudi Arabia", tier: "standard", continent: "me" },

  { name: "africa-south1", description: "Johannesburg, South Africa", tier: "standard", continent: "africa" },
];

function normalizeRegionName(name: string): string {
  return name.trim().toLowerCase();
}

export function getAllRegions(): string[] {
  return GCP_REGIONS.map((region) => region.name);
}

export function getRegionsByContinent(continent: GCPRegion["continent"]): GCPRegion[] {
  return GCP_REGIONS.filter((region) => region.continent === continent);
}

export function getPremiumRegions(): GCPRegion[] {
  return GCP_REGIONS.filter((region) => region.tier === "premium");
}

export function getRegionByName(name: string): GCPRegion | undefined {
  if (!name) return undefined;
  const normalizedName = normalizeRegionName(name);
  return GCP_REGIONS.find((region) => normalizeRegionName(region.name) === normalizedName);
}
