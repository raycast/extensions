import { fetch, TRAFFIC_GET, USER_GET } from ".";
import { TrafficData, UserData } from "../schema";

export const requestUserInfo = async (): Promise<UserData> => {
  const response = await fetch.get(USER_GET);
  return response.data;
};

export const requestUserTrafficData = async (): Promise<TrafficData> => {
  const response = await fetch.get(TRAFFIC_GET);
  return response.data;
};
