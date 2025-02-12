import { getPutioClient } from "./withPutioClient";

export const fetchHistoryEvents = async () => {
  const response = await getPutioClient().Events.Query();
  return response.data.events;
};
