import { type DepartureRaw, fetchDeparturesForStop } from "@/api";
import { addSeconds } from "date-fns";
import Papa from "papaparse";

export type Departure = {
  transportType: string;
  routeNumber: string;
  expectedIn: Date;
  destination: string;
};

export async function getDeparturesForStop(siriId: string): Promise<Departure[]> {
  const csv = await fetchDeparturesForStop(siriId);

  const parsed = Papa.parse<DepartureRaw>(csv, { delimiter: ",", skipEmptyLines: true, header: true });

  if (!Array.isArray(parsed.data)) {
    throw new Error("Invalid departures data");
  }

  return parsed.data
    .filter((row) => row.Transport !== "stop")
    .map((row) => {
      const directionKey = Object.keys(row)
        .map((key) => Number(key))
        .find((key) => key > 0);

      return {
        transportType: row.Transport,
        routeNumber: row.RouteNum,
        expectedIn: addSeconds(new Date(), Number(row.version20201024)),
        destination: directionKey ? row[directionKey] : "",
      };
    });
}
