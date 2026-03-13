import { getPreferenceValues } from "@raycast/api";
import { JsonTsOptions } from "json-ts";

const defaultRootName = "RootObject";

/**
 * Custom React hook that retrieves JSON TypeScript options from Raycast preferences
 * and provides a default root name if it is not explicitly specified.
 *
 * This hook leverages the `getPreferenceValues` API from Raycast to fetch preferences
 * set by the user for JSON TypeScript options. It ensures that the `rootName` property
 * has a value, either from the preferences or a predefined default value.
 *
 * @returns {JsonTsOptions} An object containing the JSON TypeScript options including a guaranteed `rootName`.
 *
 * @example
 * const jsonTsOptions = useJsonTsOptions();
 * console.log(jsonTsOptions.rootName); // Outputs the preferred root name or "RootObject" if none set.
 */
const useJsonTsOptions = (): JsonTsOptions => {
  const { rootName: preferredRootName, ...jsonTsOptions } = getPreferenceValues<JsonTsOptions>();
  const rootName = preferredRootName || defaultRootName;

  return { ...jsonTsOptions, rootName };
};

export default useJsonTsOptions;
