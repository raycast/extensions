import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { DocumentType, Preferences } from "../types";

export default function useDocumentTypes() {
  const { sensible_api_key } = getPreferenceValues<Preferences>();

  return useFetch<DocumentType[]>("https://api.sensible.so/dev/document_types", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sensible_api_key}`,
    },
  });
}
