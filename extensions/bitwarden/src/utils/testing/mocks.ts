import { faker } from "@faker-js/faker";
import { CARD_BRANDS, CardBrand, FieldType, Folder, IdentityTitle, Item, ItemType } from "~/types/vault";

type MockItemOptions = {
  sensitiveValue?: string;
  overrideProps?: Partial<RecursiveNonOptional<Item>>;
  itemType?: ItemType;
};

export function getMockItems(count = 10, options?: MockItemOptions): Item[] {
  return Array.from({ length: count }).map(() => getMockItem(options));
}

export function getMockItem(options?: MockItemOptions): Item {
  const { sensitiveValue = faker.random.alphaNumeric(10), itemType, overrideProps } = options || {};

  return {
    object: "item",
    id: faker.datatype.uuid(),
    organizationId: faker.datatype.uuid(),
    folderId: faker.datatype.uuid(),
    type: itemType || faker.datatype.number({ min: 1, max: 4 }),
    reprompt: faker.datatype.number({ min: 0, max: 1 }),
    name: faker.random.words(2),
    favorite: faker.datatype.boolean(),
    collectionIds: [faker.datatype.uuid()],
    revisionDate: faker.date.past().toISOString(),
    creationDate: faker.date.past().toISOString(),
    deletedDate: null,
    secureNote: { type: faker.datatype.number({ min: 0, max: 1 }) },
    notes: sensitiveValue,
    fields: [
      { name: faker.random.words(2), value: sensitiveValue, type: FieldType.HIDDEN, linkedId: null },
      { name: faker.random.words(2), value: sensitiveValue, type: FieldType.TEXT, linkedId: null },
      { name: faker.random.words(2), value: sensitiveValue, type: FieldType.BOOLEAN, linkedId: null },
      { name: faker.random.words(2), value: sensitiveValue, type: FieldType.LINKED, linkedId: null },
    ],
    login:
      !itemType || itemType === ItemType.LOGIN
        ? {
            uris: [{ match: faker.datatype.number({ min: 0, max: 5 }), uri: faker.internet.url() }],
            username: faker.internet.userName(),
            password: sensitiveValue,
            totp: sensitiveValue,
            passwordRevisionDate: sensitiveValue,
          }
        : undefined,
    passwordHistory: [{ lastUsedDate: sensitiveValue, password: sensitiveValue }],
    card:
      !itemType || itemType === ItemType.CARD
        ? {
            cardholderName: sensitiveValue,
            brand: faker.helpers.arrayElement(Object.values(CARD_BRANDS)) as CardBrand,
            number: sensitiveValue,
            expMonth: sensitiveValue,
            expYear: sensitiveValue,
            code: sensitiveValue,
          }
        : undefined,
    identity:
      !itemType || itemType === ItemType.IDENTITY
        ? {
            title: sensitiveValue as IdentityTitle,
            firstName: sensitiveValue,
            middleName: sensitiveValue,
            lastName: sensitiveValue,
            address1: sensitiveValue,
            address2: sensitiveValue,
            address3: sensitiveValue,
            city: sensitiveValue,
            state: sensitiveValue,
            postalCode: sensitiveValue,
            country: sensitiveValue,
            company: sensitiveValue,
            email: sensitiveValue,
            phone: sensitiveValue,
            ssn: sensitiveValue,
            username: sensitiveValue,
            passportNumber: sensitiveValue,
            licenseNumber: sensitiveValue,
          }
        : undefined,
    ...overrideProps,
  };
}

export function getMockFolders(count = 5): Folder[] {
  return Array.from({ length: count }).map(getMockFolder);
}

export function getMockFolder(): Folder {
  return {
    object: "folder",
    id: faker.datatype.uuid(),
    name: faker.random.words(2),
  };
}
