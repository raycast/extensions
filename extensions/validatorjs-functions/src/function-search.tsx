// src/function-search.tsx

import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types/index";
import { ValidatorList } from "./components/ValidatorList";

export default function Command() {
  const { githubToken } = getPreferenceValues<Preferences>();

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${githubToken}`,
    "User-Agent": "Raycast-Validator-Extension",
  };

  return <ValidatorList headers={headers} />;
}
