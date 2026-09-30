import { ApiCatalog, ApiProcedure, JsonObject, JsonSchema, ProcedureType } from "../types/api";
import { isJsonObject } from "./json";

function readString(record: JsonObject, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`API catalog field ${key} must be a string.`);
  }
  return value;
}

function readBoolean(record: JsonObject, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`API catalog field ${key} must be a boolean.`);
  }
  return value;
}

function readStringArray(record: JsonObject, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`API catalog field ${key} must be an array of strings.`);
  }
  return value;
}

function parseSchema(value: unknown): JsonSchema {
  if (!isJsonObject(value)) {
    throw new Error("A procedure inputSchema must be a JSON object.");
  }
  return value as JsonSchema;
}

function parseProcedure(value: unknown): ApiProcedure {
  if (!isJsonObject(value)) {
    throw new Error("Each API procedure must be a JSON object.");
  }

  const type = readString(value, "type");
  if (type !== "query" && type !== "mutation") {
    throw new Error(`Unsupported procedure type: ${type}`);
  }

  return {
    description: readString(value, "description"),
    inputSchema: parseSchema(value.inputSchema),
    path: readString(value, "path"),
    readOnly: readBoolean(value, "readOnly"),
    tags: readStringArray(value, "tags"),
    type: type satisfies ProcedureType,
  };
}

export function parseApiCatalog(value: unknown): ApiCatalog {
  if (!isJsonObject(value)) {
    throw new Error("The API catalog response must be a JSON object.");
  }

  const endpoints = value.endpoints;
  const procedures = value.procedures;
  const procedureCount = value.procedureCount;

  if (!isJsonObject(endpoints)) {
    throw new Error("The API catalog is missing endpoints.");
  }
  if (!Array.isArray(procedures)) {
    throw new Error("The API catalog is missing procedures.");
  }
  if (typeof procedureCount !== "number" || !Number.isInteger(procedureCount)) {
    throw new Error("The API catalog procedureCount must be an integer.");
  }

  const parsedProcedures = procedures.map(parseProcedure);
  if (parsedProcedures.length !== procedureCount) {
    throw new Error(`The API catalog declares ${procedureCount} procedures but returned ${parsedProcedures.length}.`);
  }

  return {
    endpoints: {
      call: readString(endpoints, "call"),
      catalog: readString(endpoints, "catalog"),
      docs: readString(endpoints, "docs"),
      mcp: readString(endpoints, "mcp"),
    },
    name: readString(value, "name"),
    procedureCount,
    procedures: parsedProcedures,
    version: readString(value, "version"),
  };
}

export function splitProcedurePath(path: string): { procedure: string; router: string } {
  const separator = path.lastIndexOf(".");
  if (separator <= 0 || separator === path.length - 1) {
    throw new Error(`Invalid procedure path: ${path}`);
  }

  return {
    router: path.slice(0, separator),
    procedure: path.slice(separator + 1),
  };
}

export function humanizeIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
