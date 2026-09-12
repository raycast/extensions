import { captureException } from "@raycast/api";
import { generateObject, jsonSchema } from "ai";
import type { StackFieldInput, StackFieldType } from "../types";
import { createClient } from "./create-client";
import { slugify } from "./slugify";

type GeneratedField = {
  label: string;
  description: string;
  type: StackFieldType;
  isTitleField: boolean;
};

type Response = {
  fields: GeneratedField[];
};

const hasAtLeastOneTitleField = (fields: GeneratedField[]) => {
  return fields.some((field) => field.isTitleField);
};

export const generateStackFields = async (description: string) => {
  const openai = await createClient();

  const schema = jsonSchema({
    type: "object",
    properties: {
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description: "Short label of the field (e.g. 'Name', 'Date of Arrival')",
            },
            description: {
              type: "string",
              description:
                "The description of the field. AI will later use this to understand the meaning of the field. Keep it simple and human.",
            },
            type: {
              type: "string",
              enum: ["text", "number", "date", "currency", "time", "boolean"],
            },
            isTitleField: {
              type: "boolean",
              description:
                "Whether the field is a title field. Title field is a field that is used to generate the title of the capture. At least one field must be a title field.",
            },
          },
          required: ["label", "description", "type", "isTitleField"],
        },
      },
    },
    required: ["fields"],
  });

  const prompt = `
        Given the following description of fields, generate an array of field objects with label, description, and type.
        Fields description:
        ${description}
    `;

  const { object } = await generateObject({
    model: openai,
    schema,
    prompt,
    maxRetries: 3,
  });

  const { fields } = object as Response;

  if (!hasAtLeastOneTitleField(fields)) {
    captureException(new Error("At least one title field is required when generating stack fields"));
    if (fields.length > 0) {
      try {
        fields[0].isTitleField = true;
      } catch (error) {
        captureException(error);
        throw error;
      }
    }
  }

  const returnFields: StackFieldInput[] = fields.map((field) => ({
    label: {
      key: slugify(field.label),
      value: field.label,
    },
    description: field.description,
    type: field.type,
    isTitleField: field.isTitleField,
  }));

  return returnFields;
};
