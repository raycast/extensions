import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { prepareFoldersForCache, prepareItemsForCache } from "~/components/searchVault/utils/caching";
import { getMockFolders, getMockItems } from "~/utils/testing/mocks";

const SENSITIVE_VALUE = "THIS-IS-A-SENSITIVE-VALUE";

describe("vault caching utils", () => {
  test("should clean items and folders of any sensitive values", () => {
    const items = getMockItems(100, SENSITIVE_VALUE);
    const folders = getMockFolders(100);
    const amountOfSensitiveValuesInItems = getStringValueCount(JSON.stringify(items), SENSITIVE_VALUE);
    const amountOfSensitiveValuesInFolders = getStringValueCount(JSON.stringify(folders), SENSITIVE_VALUE);
    const stringifiedCleanItems = JSON.stringify(prepareItemsForCache(items));
    const stringifiedCleanFolders = JSON.stringify(prepareFoldersForCache(folders));

    expect(stringifiedCleanFolders).not.toContain(SENSITIVE_VALUE);
    expect(stringifiedCleanFolders).not.toContain(SENSITIVE_VALUE);
    if (amountOfSensitiveValuesInItems > 0) {
      const amountOfHiddenValuesInCleanItems = getStringValueCount(stringifiedCleanItems, SENSITIVE_VALUE_PLACEHOLDER);
      expect(amountOfSensitiveValuesInItems).toEqual(amountOfHiddenValuesInCleanItems);
    }
    if (amountOfSensitiveValuesInFolders > 0) {
      const amountOfHiddenValuesInCleanFolders = getStringValueCount(
        stringifiedCleanFolders,
        SENSITIVE_VALUE_PLACEHOLDER
      );
      expect(amountOfSensitiveValuesInFolders).toEqual(amountOfHiddenValuesInCleanFolders);
    }
  });
});

function getStringValueCount(value: string, valueToFind: string): number {
  return value.match(new RegExp(valueToFind, "g"))?.length ?? 0;
}
