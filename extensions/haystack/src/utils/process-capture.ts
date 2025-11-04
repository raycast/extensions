import fs from "node:fs";
import { Clipboard, captureException } from "@raycast/api";
import { generateText, jsonSchema, type Tool, tool } from "ai";
import type { JSONSchema7Definition } from "json-schema";
import z from "zod";
import { PROCESS_CAPTURE_PROMPT } from "../constants/prompts";
import type { CaptureData, CaptureStack, StackField } from "../types";
import { createCapture } from "./captures";
import { createClient } from "./create-client";
import { getStacks } from "./stacks";

const getFieldDescription = (description: string, type: string) => {
  return `
        User described the purpose of this field as: ${description}.
        Type of this field is: ${type}.
        Instructions on how to deal with each type:
        - For text return the text as is.
        - For numbers return a en-US formatted number string.
        - For currency return a string containing right formatting for this currency and include currency symbol.
        - For date return a date as string in the format Month D, Yr or Month D in case year is not present or Yr, Month in case day is not present.
        - For time return a time as string in the format hh:mm a (AM/PM).
        - For boolean return "Yes" or "No".
        - If nothing on the capture matches this field, return an empty string.
    `;
};

const generateSchema = (fields: StackField[]) => {
  const keys = fields.reduce<Record<string, { type: string; description: string }>>((properties, field) => {
    properties[field.label.key] = {
      type: "string",
      description: getFieldDescription(field.description, field.type),
    };
    return properties;
  }, {});

  const schema = jsonSchema({
    type: "object",
    properties: {
      ...(keys as Record<string, JSONSchema7Definition>),
    },
    required: Object.keys(keys),
  });

  return schema;
};

const captureDataSchema = z.record(z.string());

const getAvailableTools = async ({
  onExecute,
}: {
  onExecute: ({ stack, data }: { stack: CaptureStack; title: string; data: CaptureData }) => Promise<void>;
}) => {
  const stacks = await getStacks();
  return stacks.reduce<Record<string, Tool>>((tools, stack) => {
    const schema = generateSchema(stack.fields);

    tools[`create-${stack.name.key}`] = tool({
      description: `This is user defined description of what should be collected here: ${stack.description}`,
      inputSchema: schema,
      execute: async (input) => {
        if (!input) {
          captureException(new Error("Failed tool call."));
          return;
        }
        try {
          const inputData = captureDataSchema.parse(input);

          const data: CaptureData = stack.fields.reduce((data, field) => {
            data[field.label.value] = {
              value: inputData[field.label.key],
              type: field.type,
            };
            return data;
          }, {} as CaptureData);

          const titleFields = stack.fields.filter((field) => field.isTitleField);

          if (titleFields.length === 0) {
            captureException(new Error("At least one title field is required"));
            return;
          }

          const title = titleFields.map((field) => data[field.label.value].value).join(" ");

          await onExecute({ stack: { id: stack.id, name: stack.name.value, version: stack.version }, title, data });
        } catch (error) {
          captureException(error);
          return;
        }
      },
    });
    return tools;
  }, {});
};

export const processCapture = async ({ id, path }: { id: string; path: string }) => {
  try {
    const openai = await createClient();
    const text = await Clipboard.readText();

    const handleExecute = async ({ stack, title, data }: { stack: CaptureStack; title: string; data: CaptureData }) => {
      await createCapture(id, stack, title, path, data);
    };

    const tools = await getAvailableTools({ onExecute: handleExecute });

    await generateText({
      model: openai,
      tools,
      maxRetries: 3,
      messages: [
        {
          role: "system",
          content: PROCESS_CAPTURE_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all data from provided screenshot:",
            },
            {
              type: "text",
              text: `Here's additional information from clipboard: ${text || "None"}.`,
            },
            {
              type: "image",
              image: fs.readFileSync(path),
            },
          ],
        },
      ],
    });
  } catch (error) {
    captureException(new Error("Failed to process capture", { cause: error }));
    throw error;
  }
};
