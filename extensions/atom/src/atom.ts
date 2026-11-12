import { getPreferenceValues } from "@raycast/api";
import { AtomError, AtomSuccess } from "./types";
import { showFailureToast } from "@raycast/utils";

const { api_token } = getPreferenceValues<Preferences>();
export const API_URL = "https://www.atom.com/api/registrar/v1";
export const API_HEADERS = {
  Authorization: `Bearer ${api_token}`,
  "Content-Type": "application/json",
};
export const parseAtomResponse = async <T>(response: Response) => {
  if (!response.ok && !response.headers.get("Content-Length"))
    throw new Error(response.statusText, { cause: response.status });
  const result = (await response.json()) as AtomError | AtomSuccess<T>;
  if (!result.success) {
    if (result.violations) throw new Error(result.violations[0].message, { cause: result.message });
    throw new Error(result.message, { cause: result.error });
  }
  return result.data;
};

export const showError = (error: unknown) => showFailureToast(error, { title: `${(error as Error).cause}` });
