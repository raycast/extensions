/**
 * A Raycast extension.
 */
export type Extension = NamedObject &
  TitledObject &
  DescribableObject & {
    /**
     * The path to the extension's directory.
     */
    path: string;

    /**
     * The author of the extension as defined in the extension's package.json.
     */
    author: string;

    /**
     * The description of the extension as defined in the extension's package.json.
     */
    description: string;

    /**
     * The list of commands belonging to the extension.
     */
    commands: ExtensionCommand[];
  };

/**
 * A Raycast extension command.
 */
export type ExtensionCommand = NamedObject &
  TitledObject &
  DescribableObject & {
    /**
     * The link to run the command.
     */
    deeplink: string;
  };

/**
 * Checks if a value is true in either a boolean or string form.
 * @param str The value to check.
 * @returns True if the value is true or "true" (case-insensitive), false otherwise.
 */
export const isTrueStr = (str: string | boolean | undefined) => {
  return str == true || str?.toString().toLowerCase() == "true";
};

/**
 * Errors that can arise when getting the contents of selected files.
 */
export const ERRORTYPE = {
  FINDER_INACTIVE: 1,
  MIN_SELECTION_NOT_MET: 2,
  INPUT_TOO_LONG: 3,
};

/**
 * A JSON object.
 */
export type JSONObject = {
  [key: string]: string | JSONObject | JSONObject[] | string[];
};

export type IdentifiableObject = {
  /**
   * The unique ID of the object.
   */
  id: string;
};

export type NamedObject = {
  /**
   * The name of the object.
   */
  name: string;
};

export type TitledObject = {
  /**
   * The title of the object.
   */
  title: string;
};

export type DescribableObject = {
  /**
   * A description of the object.
   */
  description: string;
};

export type VersionedObject = {
  /**
   * The version of the object.
   */
  version: string;
};

export type FavoritableObject = {
  /**
   * Whether the object is favorited.
   */
  favorited?: boolean;
};
