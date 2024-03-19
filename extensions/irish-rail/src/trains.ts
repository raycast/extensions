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
  expDepart: string;
}

type TrainDto = {
  [P in keyof Train as Capitalize<Lowercase<P>>]: string;
};

function dueAsc(a: Train, b: Train) {
  const aDueIn = parseInt(a.dueIn);
  const bDueIn = parseInt(b.dueIn);
  if (aDueIn < bDueIn) return -1;
}

function mapDto(train: TrainDto) {
  return {
    trainCode: train.Traincode,
    origin: train.Origin,
    dueIn: train.Duein,
    destination: train.Destination,
    destinationTime: train.Destinationtime,
    expDepart: train.Expdepart,
  };
}

export async function getTrains(origin: string, destination?: string): Promise<Train[]> {
  const result = await makeRequest(apiUrl(origin));
  const parsed = parseXML(result.data);

  if (!parsed?.ArrayOfObjStationData?.objStationData?.length) {
    return [];
  }

  const destinationTrains = destination
    ? parsed.ArrayOfObjStationData.objStationData.filter((train: TrainDto) => train.Destination === destination)
    : parsed.ArrayOfObjStationData.objStationData;

  if (!destinationTrains?.length) {
    return [];
  }

  return destinationTrains.map(mapDto).sort(dueAsc);
}
