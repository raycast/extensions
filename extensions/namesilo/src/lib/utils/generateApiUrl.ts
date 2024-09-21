import { API_BASE_URL, API_PARAMS } from "../constants";

export default function generateApiUrl(operation: string, params?: { [key: string]: string | string[] }) {
  const searchParams = new URLSearchParams({
    ...API_PARAMS,
    ...params,
  });
  const API = operation.includes("Auction") ? "public/api/" : "api/";
  return API_BASE_URL + API + operation + "?" + searchParams.toString();
}
