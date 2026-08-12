import { makeRequest } from "./request";
import { parseXML } from "./xml";

const STATION_DATA_URL = (station: string) =>
  `https://api.irishrail.ie/realtime/realtime.asmx/getStationDataByNameXML?StationDesc=${station}`;

const TRAIN_MOVEMENTS_URL = (trainCode: string, date: string) =>
  `https://api.irishrail.ie/realtime/realtime.asmx/getTrainMovementsXML?TrainId=${trainCode}&TrainDate=${date}`;

export interface Train {
  trainCode: string;
  origin: string;
  dueIn: string;
  destination: string;
  destinationTime: string;
  expDepart: string;
}

interface TrainDto {
  Traincode: string;
  Origin: string;
  Duein: string;
  Destination: string;
  Destinationtime: string;
  Expdepart: string;
}

interface TrainMovement {
  LocationFullName: string;
  LocationOrder: string;
  ScheduledArrival: string;
  ExpectedArrival: string;
}

// --- Helpers ---

function stationsMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function formatDateForApi(date: Date = new Date()): string {
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function dueAsc(a: Train, b: Train): number {
  return parseInt(a.dueIn) - parseInt(b.dueIn);
}

async function fetchTrainsFromStation(station: string): Promise<TrainDto[]> {
  const result = await makeRequest(STATION_DATA_URL(station));
  const parsed = parseXML(result.data);

  if (!parsed?.ArrayOfObjStationData?.objStationData?.length) {
    return [];
  }

  return parsed.ArrayOfObjStationData.objStationData;
}

async function fetchTrainMovements(trainCode: string): Promise<TrainMovement[]> {
  const result = await makeRequest(TRAIN_MOVEMENTS_URL(trainCode, formatDateForApi()));
  const parsed = parseXML(result.data);

  if (!parsed?.ArrayOfObjTrainMovements?.objTrainMovements) {
    return [];
  }

  const movements = parsed.ArrayOfObjTrainMovements.objTrainMovements;
  return Array.isArray(movements) ? movements : [movements];
}

function findStationOrder(movements: TrainMovement[], stationName: string): number | undefined {
  const stop = movements.find((m) => stationsMatch(m.LocationFullName, stationName));
  return stop ? parseInt(stop.LocationOrder) : undefined;
}

function findStopAfterOrder(
  movements: TrainMovement[],
  stationName: string,
  afterOrder?: number,
): TrainMovement | undefined {
  return movements.find((m) => {
    const isAfterOrigin = afterOrder === undefined || parseInt(m.LocationOrder) > afterOrder;
    return stationsMatch(m.LocationFullName, stationName) && isAfterOrigin;
  });
}

// --- Exported functions ---

export async function getReachableDestinations(origin: string): Promise<string[]> {
  const trains = await fetchTrainsFromStation(origin);

  const allMovements = await Promise.all(
    trains.map(async (train) => ({
      train,
      movements: await fetchTrainMovements(train.Traincode),
    })),
  );

  const reachableStations = new Set<string>();

  for (const { train, movements } of allMovements) {
    const originOrder = findStationOrder(movements, origin) ?? -1;

    for (const movement of movements) {
      if (parseInt(movement.LocationOrder) > originOrder && movement.LocationFullName) {
        reachableStations.add(movement.LocationFullName);
      }
    }

    // Fallback: add final destination in case movements API failed
    if (train.Destination) {
      reachableStations.add(train.Destination);
    }
  }

  // Remove origin station and any empty values
  reachableStations.delete(origin);
  reachableStations.delete("");

  return Array.from(reachableStations).sort();
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
  const trains = await fetchTrainsFromStation(origin);

  if (!destination) {
    return trains.map(mapDto).sort(dueAsc);
  }

  const trainsWithRouteInfo = await Promise.all(
    trains.map(async (train) => {
      // Quick path: destination matches final terminus
      if (train.Destination === destination) {
        return { train, stopsAtDestination: true, arrivalTime: train.Destinationtime };
      }

      const movements = await fetchTrainMovements(train.Traincode);
      const originOrder = findStationOrder(movements, origin);
      const destStop = findStopAfterOrder(movements, destination, originOrder);

      return {
        train,
        stopsAtDestination: !!destStop,
        arrivalTime: destStop?.ExpectedArrival || destStop?.ScheduledArrival,
      };
    }),
  );

  return trainsWithRouteInfo
    .filter((t) => t.stopsAtDestination)
    .map((t) => ({
      ...mapDto(t.train),
      destinationTime: t.arrivalTime ?? t.train.Destinationtime,
    }))
    .sort(dueAsc);
}
