import { describe, expect, test } from "vitest";

import { formatValues } from "./formatValues";
import { DataModelWithFields } from "../services/zod/schema/recordFieldSchema";

const baseField = (overrides = {}) => ({
  id: "field-1",
  type: "TEXT",
  name: "name",
  label: "Name",
  description: null,
  isCustom: true,
  isActive: true,
  isSystem: false,
  isNullable: false,
  defaultValue: null,
  options: null,
  ...overrides,
});

const createObjectMetadata = (fields: Array<ReturnType<typeof baseField>>) =>
  ({
    id: "person",
    dataSourceId: "source-1",
    nameSingular: "person",
    namePlural: "people",
    labelSingular: "Person",
    labelPlural: "People",
    description: null,
    isCustom: true,
    isActive: true,
    isSystem: false,
    fields,
  }) as DataModelWithFields;

describe("formatValues", () => {
  test("formats composite native field values for Twenty", () => {
    const objectRecordMetadata = createObjectMetadata([
      baseField({ id: "field-name", name: "name", type: "FULL_NAME", label: "Name" }),
      baseField({ id: "field-emails", name: "emails", type: "EMAILS", label: "Emails" }),
      baseField({ id: "field-website", name: "website", type: "LINKS", label: "Website" }),
      baseField({ id: "field-active", name: "isActive", type: "BOOLEAN", label: "Active" }),
      baseField({ id: "field-budget", name: "budget", type: "CURRENCY", label: "Budget" }),
      baseField({ id: "field-phones", name: "phones", type: "PHONES", label: "Phones" }),
    ]);

    expect(
      formatValues(
        {
          name: "Ada Lovelace",
          emails: "ada@example.com, team@example.com",
          website: "https://example.com",
          isActive: true,
          budget__amount: "12.5",
          budget__currencyCode: "usd",
          phones__primaryPhoneNumber: "+1 415 555 0101",
          phones__primaryPhoneCountryCode: "US",
          phones__primaryPhoneCallingCode: "+1",
        },
        objectRecordMetadata,
      ),
    ).toEqual({
      name: {
        firstName: "Ada",
        lastName: "Lovelace",
      },
      emails: {
        primaryEmail: "ada@example.com",
        additionalEmails: ["team@example.com"],
      },
      website: {
        primaryLinkUrl: "https://example.com",
        primaryLinkLabel: "example.com",
        secondaryLinks: [],
      },
      isActive: true,
      budget: {
        amountMicros: 12500000,
        currencyCode: "USD",
      },
      phones: {
        primaryPhoneNumber: "+1 415 555 0101",
        primaryPhoneCountryCode: "US",
        primaryPhoneCallingCode: "+1",
        additionalPhones: null,
      },
    });
  });
});
