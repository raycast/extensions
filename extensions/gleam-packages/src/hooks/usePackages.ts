import { useFetch } from "@raycast/utils";
import { ApiResponse } from "../types";

export default function usePackages() {
  return useFetch<ApiResponse>(`https://packages.gleam.run/api/packages`);
}
