import { makeRequest } from "./request";
import { parseXML } from "./xml";

const API_URL = "http://api.irishrail.ie/realtime/realtime.asmx/getAllStationsXML";

interface Station {
  StationDesc: string;
}

export async function getStations() {
  const result = await makeRequest(API_URL);
  const parsed = parseXML(result.data);
  const stations = parsed.ArrayOfObjStation.objStation.map((station: Station) => station.StationDesc);
  return stations;
}
