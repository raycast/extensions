import { Location } from "./types";
/**
 * TODO: consider adding more readable labels
 */
export const locations: Location[] = [
  {
    partregion_id: 11,
    partregion_name: "Inseln und Marschen",
    region_id: 10,
    region_name: "Schleswig-Holstein und Hamburg",
  },
  {
    partregion_id: 12,
    partregion_name: "Geest,Schleswig-Holstein und Hamburg",
    region_id: 10,
    region_name: "Schleswig-Holstein und Hamburg",
  },
  {
    partregion_id: -1,
    partregion_name: "",
    region_id: 20,
    region_name: "Mecklenburg-Vorpommern",
  },
  {
    partregion_id: 31,
    partregion_name: "Westl. Niedersachsen/Bremen",
    region_id: 30,
    region_name: "Niedersachsen und Bremen",
  },
  {
    partregion_id: 32,
    partregion_name: "Östl. Niedersachsen",
    region_id: 30,
    region_name: "Niedersachsen und Bremen",
  },
  {
    partregion_id: 41,
    partregion_name: "Rhein.-Westfäl. Tiefland",
    region_id: 40,
    region_name: "Nordrhein-Westfalen",
  },
  {
    partregion_id: 42,
    partregion_name: "Ostwestfalen",
    region_id: 40,
    region_name: "Nordrhein-Westfalen",
  },
  {
    partregion_id: 43,
    partregion_name: "Mittelgebirge NRW",
    region_id: 40,
    region_name: "Nordrhein-Westfalen",
  },
  {
    partregion_id: -1,
    partregion_name: "",
    region_id: 50,
    region_name: "Brandenburg und Berlin",
  },
  {
    partregion_id: 61,
    partregion_name: "Tiefland Sachsen-Anhalt",
    region_id: 60,
    region_name: "Sachsen-Anhalt",
  },
  {
    partregion_id: 62,
    partregion_name: "Harz",
    region_id: 60,
    region_name: "Sachsen-Anhalt",
  },
  {
    partregion_id: 71,
    partregion_name: "Tiefland Thüringen",
    region_id: 70,
    region_name: "Thüringen",
  },
  {
    partregion_id: 72,
    partregion_name: "Mittelgebirge Thüringen",
    region_id: 70,
    region_name: "Thüringen",
  },
  {
    partregion_id: 81,
    partregion_name: "Tiefland Sachsen",
    region_id: 80,
    region_name: "Sachsen",
  },
  {
    partregion_id: 82,
    partregion_name: "Mittelgebirge Sachsen",
    region_id: 80,
    region_name: "Sachsen",
  },
  {
    partregion_id: 91,
    partregion_name: "Nordhessen und hess. Mittelgebirge",
    region_id: 90,
    region_name: "Hessen",
  },
  {
    partregion_id: 92,
    partregion_name: "Rhein-Main",
    region_id: 90,
    region_name: "Hessen",
  },
  {
    partregion_id: 101,
    partregion_name: "Rhein, Pfalz, Nahe und Mosel",
    region_id: 100,
    region_name: "Rheinland-Pfalz und Saarland",
  },
  {
    partregion_id: 102,
    partregion_name: "Mittelgebirgsbereich Rheinland-Pfalz",
    region_id: 100,
    region_name: "Rheinland-Pfalz und Saarland",
  },
  {
    partregion_id: 103,
    partregion_name: "Saarland",
    region_id: 100,
    region_name: "Rheinland-Pfalz und Saarland",
  },
  {
    partregion_id: 111,
    partregion_name: "Oberrhein und unteres Neckartal",
    region_id: 110,
    region_name: "Baden-Württemberg",
  },
  {
    partregion_id: 112,
    partregion_name: "Hohenlohe/mittlerer Neckar/Oberschwaben",
    region_id: 110,
    region_name: "Baden-Württemberg",
  },
  {
    partregion_id: 113,
    partregion_name: "Mittelgebirge Baden-Württemberg",
    region_id: 110,
    region_name: "Baden-Württemberg",
  },
  {
    partregion_id: 121,
    partregion_name: "Allgäu/Oberbayern/Bay. Wald",
    region_id: 120,
    region_name: "Bayern",
  },
  {
    partregion_id: 122,
    partregion_name: "Donauniederungen",
    region_id: 120,
    region_name: "Bayern",
  },
  {
    partregion_id: 123,
    partregion_name: "Bayern nördl. der Donau, o. Bayr. Wald, o. Mainfranken",
    region_id: 120,
    region_name: "Bayern",
  },
  {
    partregion_id: 124,
    partregion_name: "Mainfranken",
    region_id: 120,
    region_name: "Bayern",
  },
]; /**
 * Tries to find the location by its id
 * @param id format "region_id:partregion_id"
 * @returns the location object or undefined
 */
export function getLocation(id: string): Location | undefined {
  const [region_id, partregion_id] = id.split(":").map((id) => parseInt(id));
  return locations.find((location) => location.partregion_id === partregion_id && location.region_id === region_id);
}
