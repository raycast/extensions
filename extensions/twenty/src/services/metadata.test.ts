import { describe, expect, test, vi } from "vitest";

import { createMetadataService } from "./metadata";

const createClient = (response: unknown) =>
  ({
    requestJson: vi.fn().mockResolvedValue(response),
  }) as unknown as Parameters<typeof createMetadataService>[0];

describe("createMetadataService", () => {
  test("getActiveDataModels returns only active non-system objects", async () => {
    const client = createClient({
      data: {
        objects: [
          {
            id: "person",
            dataSourceId: "source-1",
            nameSingular: "person",
            namePlural: "people",
            labelSingular: "Person",
            labelPlural: "People",
            description: null,
            icon: null,
            isCustom: true,
            isActive: true,
            isSystem: false,
          },
          {
            id: "workspace",
            dataSourceId: "source-1",
            nameSingular: "workspace",
            namePlural: "workspaces",
            labelSingular: "Workspace",
            labelPlural: "Workspaces",
            description: null,
            icon: null,
            isCustom: false,
            isActive: true,
            isSystem: true,
          },
          {
            id: "archived-project",
            dataSourceId: "source-1",
            nameSingular: "archived-project",
            namePlural: "archived-projects",
            labelSingular: "Archived Project",
            labelPlural: "Archived Projects",
            description: null,
            icon: null,
            isCustom: true,
            isActive: false,
            isSystem: false,
          },
        ],
      },
    });

    await expect(createMetadataService(client).getActiveDataModels()).resolves.toEqual([
      {
        id: "person",
        dataSourceId: "source-1",
        nameSingular: "person",
        namePlural: "people",
        labelSingular: "Person",
        labelPlural: "People",
        description: null,
        icon: null,
        isCustom: true,
        isActive: true,
        isSystem: false,
      },
    ]);
  });

  test("getRecordFieldsForDataModel filters unsupported and system fields", async () => {
    const client = createClient({
      data: {
        object: {
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
          fields: [
            {
              id: "field-name",
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
            },
            {
              id: "field-updated-at",
              type: "DATE_TIME",
              name: "updatedAt",
              label: "Updated At",
              description: null,
              isCustom: false,
              isActive: true,
              isSystem: true,
              isNullable: true,
              defaultValue: null,
              options: null,
            },
            {
              id: "field-company",
              type: "RELATION",
              name: "company",
              label: "Company",
              description: null,
              isCustom: true,
              isActive: true,
              isSystem: false,
              isNullable: true,
              defaultValue: null,
              options: null,
            },
          ],
        },
      },
    });

    await expect(createMetadataService(client).getRecordFieldsForDataModel("person")).resolves.toEqual({
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
      fields: [
        {
          id: "field-name",
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
        },
      ],
    });
  });
});
