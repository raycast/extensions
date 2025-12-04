import axios, { AxiosResponse } from "axios";

export async function fetchGlucoseData(
  sessionId: string,
  dexcomURL: string,
): Promise<AxiosResponse> {
  const response = await axios.post(dexcomURL, {
    sessionId,
    minutes: 1440,
    maxCount: 200,
  });
  return response;
}
