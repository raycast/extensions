import { API_URL, API_PARAMS } from "../constants";

export default function generateApiUrl(operation: string, params?: { [key: string]: string | string[] }) {
  const searchParams = new URLSearchParams({
    ...API_PARAMS,
    ...params,
  });
  return API_URL + operation + "?" + searchParams.toString();
}
