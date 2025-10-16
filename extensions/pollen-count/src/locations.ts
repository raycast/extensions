import { Location } from "./types";
/**
 * TODO: consider adding more readable labels
 */
export const locations: Location[] = [
  {
    partregion_id: 11,
    partregion_name: "Islands & Marshes",
    region_id: 10,
    region_name: "Schleswig-Holstein & Hamburg",
  },
  {
    partregion_id: 12,
    partregion_name: "Geest",
    region_id: 10,
    region_name: "Schleswig-Holstein & Hamburg",
  },
  {
    partregion_id: -1,
    partregion_name: "",
    region_id: 20,
    region_name: "Mecklenburg-Western Pomerania",
  },
  {
    partregion_id: 31,
    partregion_name: "West Lower Saxony / Bremen",
    region_id: 30,
    region_name: "Lower Saxony & Bremen",
  },
  {
    partregion_id: 32,
    partregion_name: "East Lower Saxony",
    region_id: 30,
    region_name: "Lower Saxony & Bremen",
  },
  {
    partregion_id: 41,
    partregion_name: "Westphalian Lowlands",
    region_id: 40,
    region_name: "North Rhine-Westphalia",
  },
  {
    partregion_id: 42,
    partregion_name: "East Westphalia",
    region_id: 40,
    region_name: "North Rhine-Westphalia",
  },
  {
    partregion_id: 43,
    partregion_name: "Central Uplands",
    region_id: 40,
    region_name: "North Rhine-Westphalia",
  },
  {
    partregion_id: -1,
    partregion_name: "",
    region_id: 50,
    region_name: "Brandenburg & Berlin",
  },
  {
    partregion_id: 61,
    partregion_name: "Lowlands",
    region_id: 60,
    region_name: "Saxony-Anhalt",
  },
  {
    partregion_id: 62,
    partregion_name: "Harz Mountains",
    region_id: 60,
    region_name: "Saxony-Anhalt",
  },
  {
    partregion_id: 71,
    partregion_name: "Lowlands",
    region_id: 70,
    region_name: "Thuringia",
  },
  {
    partregion_id: 72,
    partregion_name: "Central Uplands",
    region_id: 70,
    region_name: "Thuringia",
  },
  {
    partregion_id: 81,
    partregion_name: "Lowlands",
    region_id: 80,
    region_name: "Saxony",
  },
  {
    partregion_id: 82,
    partregion_name: "Central Uplands",
    region_id: 80,
    region_name: "Saxony",
  },
  {
    partregion_id: 91,
    partregion_name: "North Hesse & Uplands",
    region_id: 90,
    region_name: "Hesse",
  },
  {
    partregion_id: 92,
    partregion_name: "Rhine-Main",
    region_id: 90,
    region_name: "Hesse",
  },
  {
    partregion_id: 101,
    partregion_name: "Rhine, Palatinate & Moselle",
    region_id: 100,
    region_name: "Rhineland-Palatinate & Saarland",
  },
  {
    partregion_id: 102,
    partregion_name: "Uplands",
    region_id: 100,
    region_name: "Rhineland-Palatinate & Saarland",
  },
  {
    partregion_id: 103,
    partregion_name: "Saarland",
    region_id: 100,
    region_name: "Rhineland-Palatinate & Saarland",
  },
  {
    partregion_id: 111,
    partregion_name: "Upper Rhine & Lower Neckar",
    region_id: 110,
    region_name: "Baden-Württemberg",
  },
  {
    partregion_id: 112,
    partregion_name: "Hohenlohe & Upper Swabia",
    region_id: 110,
    region_name: "Baden-Württemberg",
  },
  {
    partregion_id: 113,
    partregion_name: "Uplands",
    region_id: 110,
    region_name: "Baden-Württemberg",
  },
  {
    partregion_id: 121,
    partregion_name: "Allgäu & Bavarian Forest",
    region_id: 120,
    region_name: "Bavaria",
  },
  {
    partregion_id: 122,
    partregion_name: "Danube Lowlands",
    region_id: 120,
    region_name: "Bavaria",
  },
  {
    partregion_id: 123,
    partregion_name: "North of Danube (excl. Forest/Main Franconia)",
    region_id: 120,
    region_name: "Bavaria",
  },
  {
    partregion_id: 124,
    partregion_name: "Main Franconia",
    region_id: 120,
    region_name: "Bavaria",
  },
];

/**
 * Tries to find the location by its id
 * @param id format "region_id:partregion_id"
 * @returns the location object or undefined
 */
export function getLocation(id: string): Location | undefined {
  const [region_id, partregion_id] = id.split(":").map((id) => parseInt(id));
  return locations.find((location) => location.partregion_id === partregion_id && location.region_id === region_id);
}
