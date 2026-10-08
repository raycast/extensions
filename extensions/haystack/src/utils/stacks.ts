import { captureException, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { STORAGE_KEYS } from "../constants";
import { StackFieldInputSchema, StackInputSchema, StackSchema } from "../schemas";
import type { Stack, StackField, StackFieldInput, StackInput } from "../types";
import { getCurrentTimestamp } from "./date-formatter";

const getStackKey = (id: string) => `${STORAGE_KEYS.STACKS_PREFIX}-${id}`;

export const getStacks = async () => {
  try {
    const stackMap = await LocalStorage.allItems();

    if (!stackMap) {
      return [];
    }

    const stacks: Stack[] = [];

    for (const [key, value] of Object.entries(stackMap)) {
      if (!key.startsWith(STORAGE_KEYS.STACKS_PREFIX)) {
        continue;
      }

      try {
        const parsed = JSON.parse(value);
        const validated = StackSchema.parse(parsed);
        stacks.push(validated);
      } catch (error) {
        captureException(new Error(`Invalid stack data for key ${key}`, { cause: error }));
        // Skip invalid entries but continue processing others
      }
    }

    return stacks;
  } catch (error) {
    captureException(new Error("Failed to get stacks from storage", { cause: error }));
    return [];
  }
};

export const getStackById = async (id: string) => {
  try {
    const stack = await LocalStorage.getItem(getStackKey(id));

    if (!stack) {
      return null;
    }

    const parsed = JSON.parse(stack.toString());
    return StackSchema.parse(parsed);
  } catch (error) {
    captureException(new Error(`Failed to get stack with id ${id}`, { cause: error }));
    return null;
  }
};

export const createStack = async (input: StackInput) => {
  try {
    StackInputSchema.parse(input);

    const id = nanoid();
    const timestamp = getCurrentTimestamp();
    const stack: Stack = {
      ...input,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      fields: [],
      version: 0,
    };

    await LocalStorage.setItem(getStackKey(id), JSON.stringify(stack));
    return stack;
  } catch (error) {
    captureException(new Error("Failed to create stack", { cause: error }));
    throw error;
  }
};

export const createStackWithFields = async (input: StackInput, fieldInputs: StackFieldInput[]) => {
  try {
    StackInputSchema.parse(input);
    const validatedFields = fieldInputs.map((field) => StackFieldInputSchema.parse(field));

    const id = nanoid();
    const timestamp = getCurrentTimestamp();

    const fields: StackField[] = validatedFields.map((field) => ({
      ...field,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    const stack: Stack = {
      ...input,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      fields,
      version: 0,
    };

    await LocalStorage.setItem(getStackKey(id), JSON.stringify(stack));
    return stack;
  } catch (error) {
    captureException(new Error("Failed to create stack with fields", { cause: error }));
    throw error;
  }
};

export const updateStack = async (id: string, input: Partial<StackInput>) => {
  try {
    const stack = await getStackById(id);

    if (!stack) {
      const error = new Error(`Stack with id ${id} not found`);
      captureException(error);
      throw error;
    }

    const timestamp = getCurrentTimestamp();
    const updatedStack: Stack = {
      ...stack,
      ...input,
      updatedAt: timestamp,
      version: stack.version + 1,
    };

    await LocalStorage.setItem(getStackKey(id), JSON.stringify(updatedStack));
    return updatedStack;
  } catch (error) {
    captureException(new Error(`Failed to update stack with id ${id}`, { cause: error }));
    throw error;
  }
};

export const deleteStack = async (id: string) => {
  try {
    await LocalStorage.removeItem(getStackKey(id));
  } catch (error) {
    captureException(new Error(`Failed to delete stack with id ${id}`, { cause: error }));
    throw error;
  }
};

export const getStackFields = async (stackId: string) => {
  try {
    const stack = await getStackById(stackId);

    if (!stack) {
      captureException(new Error(`Stack with id ${stackId} not found when getting fields`));
      return [];
    }

    return stack.fields;
  } catch (error) {
    captureException(new Error(`Failed to get fields for stack ${stackId}`, { cause: error }));
    return [];
  }
};

const updateStackWithFields = async (stack: Stack, fields: StackField[]) => {
  const timestamp = getCurrentTimestamp();
  const updatedStack: Stack = {
    ...stack,
    fields,
    updatedAt: timestamp,
    version: stack.version + 1,
  };

  await LocalStorage.setItem(getStackKey(stack.id), JSON.stringify(updatedStack));
  return updatedStack;
};

export const addFieldToStack = async (stackId: string, field: StackFieldInput) => {
  try {
    StackFieldInputSchema.parse(field);

    const stack = await getStackById(stackId);
    if (!stack) {
      const error = new Error(`Stack with id ${stackId} not found`);
      captureException(error);
      throw error;
    }

    const timestamp = getCurrentTimestamp();
    const newField: StackField = {
      ...field,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return await updateStackWithFields(stack, [...stack.fields, newField]);
  } catch (error) {
    captureException(new Error(`Failed to add field to stack ${stackId}`, { cause: error }));
    throw error;
  }
};

export const addFieldsToStack = async (stackId: string, fields: StackFieldInput[]) => {
  try {
    const validatedFields = fields.map((field) => StackFieldInputSchema.parse(field));

    const stack = await getStackById(stackId);
    if (!stack) {
      const error = new Error(`Stack with id ${stackId} not found`);
      captureException(error);
      throw error;
    }

    const timestamp = getCurrentTimestamp();
    const newFields: StackField[] = validatedFields.map((field) => ({
      ...field,
      id: nanoid(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    return await updateStackWithFields(stack, [...stack.fields, ...newFields]);
  } catch (error) {
    captureException(new Error(`Failed to add fields to stack ${stackId}`, { cause: error }));
    throw error;
  }
};

export const updateFieldInStack = async (stackId: string, fieldId: string, fieldUpdate: Partial<StackFieldInput>) => {
  try {
    const stack = await getStackById(stackId);
    if (!stack) {
      const error = new Error(`Stack with id ${stackId} not found`);
      captureException(error);
      throw error;
    }

    const fieldIndex = stack.fields.findIndex((f) => f.id === fieldId);
    if (fieldIndex === -1) {
      const error = new Error(`Field with id ${fieldId} not found in stack ${stackId}`);
      captureException(error);
      throw error;
    }

    const timestamp = getCurrentTimestamp();
    const updatedField: StackField = {
      ...stack.fields[fieldIndex],
      ...fieldUpdate,
      updatedAt: timestamp,
    };

    const updatedFields = [...stack.fields];
    updatedFields[fieldIndex] = updatedField;

    return await updateStackWithFields(stack, updatedFields);
  } catch (error) {
    captureException(
      new Error(`Failed to update field ${fieldId} in stack ${stackId}`, {
        cause: error,
      }),
    );
    throw error;
  }
};

export const deleteFieldFromStack = async (stackId: string, fieldId: string) => {
  try {
    const stack = await getStackById(stackId);
    if (!stack) {
      const error = new Error(`Stack with id ${stackId} not found`);
      captureException(error);
      throw error;
    }

    const updatedFields = stack.fields.filter((field) => field.id !== fieldId);
    return await updateStackWithFields(stack, updatedFields);
  } catch (error) {
    captureException(
      new Error(`Failed to delete field ${fieldId} from stack ${stackId}`, {
        cause: error,
      }),
    );
    throw error;
  }
};
