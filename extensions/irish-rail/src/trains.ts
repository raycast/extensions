import { makeRequest } from "./request";
import { parseXML } from "./xml";

const apiUrl = (origin: string) =>
  `https://api.irishrail.ie/realtime/realtime.asmx/getStationDataByNameXML?StationDesc=${origin}`;

export interface Train {
  trainCode: string;
  origin: string;
  dueIn: string;
  destination: string;
  destinationTime: string;
}

export type TrainData = {
  [P in keyof Train as Capitalize<Lowercase<P>>]: string;
}

function dueAsc(a: TrainData, b: TrainData) {
  const aDueIn = parseInt(a.Duein);
  const bDueIn = parseInt(b.Duein);
  if (aDueIn < bDueIn) return -1;
}

export async function getTrains(origin: string, destination?: string): Promise<TrainData[]> {
  const result = await makeRequest(apiUrl(origin));
  const parsed = parseXML(result.data);

  if (!parsed?.ArrayOfObjStationData?.objStationData?.length) {
    return [];
  }

  const destinationTrains = destination
    ? parsed.ArrayOfObjStationData.objStationData.filter((train: TrainData) => train.Destination === destination)
    : parsed.ArrayOfObjStationData.objStationData;

  if (!destinationTrains?.length) {
    return [];
  }

  return [...destinationTrains.sort(dueAsc)];
}
