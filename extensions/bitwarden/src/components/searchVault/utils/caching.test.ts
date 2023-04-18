import { FieldType, Folder, Item } from "~/types/vault";
import { faker } from "@faker-js/faker";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import { prepareFoldersForCache, prepareItemsForCache } from "~/components/searchVault/utils/caching";

const SENSITIVE_VALUE = "THIS-IS-A-SENSITIVE-VALUE";

describe("vault caching utils", () => {
  test("should clean items and folders of any sensitive values", () => {
    const items = getMockItems(100);
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

function getMockItems(count = 10): Item[] {
  return [...Array(count)].map(
    (): RecursiveNonOptional<Item> => ({
      object: "item",
      id: faker.datatype.uuid(),
      organizationId: faker.datatype.uuid(),
      folderId: faker.datatype.uuid(),
      type: faker.datatype.number({ min: 1, max: 4 }),
      reprompt: faker.datatype.number({ min: 0, max: 1 }),
      name: faker.random.words(2),
      favorite: faker.datatype.boolean(),
      collectionIds: [faker.datatype.uuid()],
      revisionDate: faker.date.past().toISOString(),
      creationDate: faker.date.past().toISOString(),
      deletedDate: null,
      secureNote: { type: faker.datatype.number({ min: 0, max: 1 }) },
      notes: SENSITIVE_VALUE,
      fields: [
        { name: faker.random.words(2), value: SENSITIVE_VALUE, type: FieldType.HIDDEN, linkedId: null },
        { name: faker.random.words(2), value: SENSITIVE_VALUE, type: FieldType.TEXT, linkedId: null },
        { name: faker.random.words(2), value: SENSITIVE_VALUE, type: FieldType.BOOLEAN, linkedId: null },
        { name: faker.random.words(2), value: SENSITIVE_VALUE, type: FieldType.LINKED, linkedId: null },
      ],
      login: {
        uris: [{ match: faker.datatype.number({ min: 0, max: 5 }), uri: faker.internet.url() }],
        username: faker.internet.userName(),
        password: SENSITIVE_VALUE,
        totp: SENSITIVE_VALUE,
        passwordRevisionDate: SENSITIVE_VALUE,
      },
      passwordHistory: [{ lastUsedDate: SENSITIVE_VALUE, password: SENSITIVE_VALUE }],
      card: {
        cardholderName: SENSITIVE_VALUE,
        brand: SENSITIVE_VALUE,
        number: SENSITIVE_VALUE,
        expMonth: SENSITIVE_VALUE,
        expYear: SENSITIVE_VALUE,
        code: SENSITIVE_VALUE,
      },
      identity: {
        middleName: SENSITIVE_VALUE,
        lastName: SENSITIVE_VALUE,
        address1: SENSITIVE_VALUE,
        address2: SENSITIVE_VALUE,
        address3: SENSITIVE_VALUE,
        city: SENSITIVE_VALUE,
        state: SENSITIVE_VALUE,
        postalCode: SENSITIVE_VALUE,
        country: SENSITIVE_VALUE,
        company: SENSITIVE_VALUE,
        email: SENSITIVE_VALUE,
        phone: SENSITIVE_VALUE,
        ssn: SENSITIVE_VALUE,
        username: SENSITIVE_VALUE,
        passportNumber: SENSITIVE_VALUE,
        licenseNumber: SENSITIVE_VALUE,
      },
    })
  );
}

function getMockFolders(count = 5): Folder[] {
  return [...Array(count)].map(() => ({
    object: "folder",
    id: faker.datatype.uuid(),
    name: faker.random.words(2),
  }));
}
