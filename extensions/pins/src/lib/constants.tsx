/**
 * Storage keys used throughout the extension.
 */
export enum StorageKey {
  /**
   * The list of stored pins.
   */
  LOCAL_PINS = "localPins",

  /**
   * The list of stored groups.
   */
  LOCAL_GROUPS = "localGroups",

  /**
   * The ID of the next pin to be created. This is generally the highest ID in the list of pins, but it is not guaranteed. It is used to ensure that each pin has a unique ID.
   */
  NEXT_PIN_ID = "nextPinID",

  /**
   * The ID of the next group to be created. This is generally the highest ID in the list of groups, but it is not guaranteed. It is used to ensure that each group has a unique ID.
   */
  NEXT_GROUP_ID = "nextGroupID",

  /**
   * The list of recently used applications. This is used to cache the list of applications so that it does not need to be fetched every time the list of pins is displayed.
   */
  RECENT_APPS = "recentApplications",

  /**
   * Whether or not the user has installed the example pins.
   */
  EXAMPLES_INSTALLED = "examplesInstalled",

  /**
   * UUID placeholders used thus far.
   */
  USED_UUIDS = "usedUUIDs",

  /**
   * The ID of the pin that was most recently opened.
   */
  LAST_OPENED_PIN = "lastOpenedPin",
}
