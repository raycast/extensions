export const SECRET_STRING = "••••••••••••••";

export const DATABASE_TYPES: Record<string, string[]> = {
  PostgreSQL: ["17", "16", "15", "14", "13", "12", "11", "10", "9.6"],
  MySQL: ["9.0", "8.0"],
  MariaDB: ["11.1", "11.0", "10.11", "10.6", "10.5", "10.4"],
  Redis: ["8.x", "7.x", "6.x", "5.0"],
  Valkey: ["7.2"],
};
export const DATABASE_RESOURCE_TYPES: Record<string, { resources: string; size: string; cost: string }> = {
  db1: {
    resources: "0.25 CPU / 0.25 GB RAM",
    size: "1 GB Disk space",
    cost: "5 USD / month",
  },
  db2: {
    resources: "0.5 CPU / 2 GB RAM",
    size: "5 GB Disk space",
    cost: "34 USD / month",
  },
  db3: {
    resources: "1 CPU / 4 GB RAM",
    size: "10 GB Disk space",
    cost: "65 USD / month",
  },
  db4: {
    resources: "2 CPU / 8 GB RAM",
    size: "20 GB Disk space",
    cost: "145 USD / month",
  },
  db5: {
    resources: "4 CPU / 16 GB RAM",
    size: "40 GB Disk space",
    cost: "310 USD / month",
  },
  db6: {
    resources: "8 CPU / 32 GB RAM",
    size: "60 GB Disk space",
    cost: "800 USD / month",
  },
  db7: {
    resources: "14.5 CPU / 58 GB RAM",
    size: "80 GB Disk space",
    cost: "1200 USD / month",
  },
  db8: {
    resources: "28.5 CPU / 108.5 GB RAM",
    size: "90 GB Disk space",
    cost: "1850 USD / month",
  },
  db9: {
    resources: "58.5 CPU / 229 GB RAM",
    size: "100 GB Disk space",
    cost: "3250 USD / month",
  },
};
export const DATABASE_LOCATIONS: Record<string, Array<[string, string]>> = {
  "North America": [
    ["Ashburn, Virginia", "us-east4"],
    ["Council Bluffs, Iowa", "us-central1"],
    ["Las Vegas, Nevada", "us-west4"],
    ["Los Angeles, California", "us-west2"],
    ["Montréal, Québec", "northamerica-northeast1"],
    ["Salt Lake City, Utah", "us-west3"],
    ["South Carolina, USA", "us-east1"],
    ["The Dalles, Oregon", "us-west1"],
  ],
  "South America": [
    ["Osasco, São Paulo", "southamerica-east1"],
    ["Santiago, Chile", "southamerica-west1"],
  ],
  Europe: [
    ["Belgium", "europe-west1"],
    ["Eemshaven, Netherlands", "europe-west4"],
    ["Frankfurt, Germany Europe", "europe-west3"],
    ["Hamina, Finland", "europe-north1"],
    ["London, England", "europe-west2"],
    ["Zurich, Switzerland", "europe-west6"],
  ],
  Asia: [
    ["Changhua County, Taiwan", "asia-east1"],
    ["Delhi, India APAC", "asia-south2"],
    ["Hong Kong, APAC", "asia-east2"],
    ["Jurong West, Singapore", "asia-southeast1"],
    ["Mumbai, India APAC", "asia-south1"],
    ["Osaka, Japan", "asia-northeast2"],
    ["Seoul, South Korea", "asia-northeast3"],
    ["Tokyo, Japan", "asia-northeast1"],
  ],
  Australia: [["Sydney, Australia", "australia-southeast1"]],
};
