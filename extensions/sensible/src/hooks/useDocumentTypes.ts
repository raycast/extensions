import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import type { DocumentType } from "../types";

const ENV = "v0";

export default function useDocumentTypes() {
  const { sensible_api_key } = getPreferenceValues<ExtensionPreferences>();

  return useFetch<DocumentType[]>(`https://api.sensible.so/${ENV}/document_types`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sensible_api_key}`,
    },
  });
}
