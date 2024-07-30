import { getPreferenceValues } from "@raycast/api";
import { JsonTsOptions } from "json-ts";

const defaultRootName = "RootObject";

const useJsonTsOptions = (): JsonTsOptions => {
  const { rootName: preferredRootName, ...jsonTsOptions } = getPreferenceValues<JsonTsOptions>();
  const rootName = preferredRootName || defaultRootName;

  return { ...jsonTsOptions, rootName };
};

export default useJsonTsOptions;
