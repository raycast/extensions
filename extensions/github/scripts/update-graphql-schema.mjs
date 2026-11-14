#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

import { buildSchema, isInputObjectType, isObjectType } from "graphql";

const schemaUrl =
  "https://raw.githubusercontent.com/github/docs/main/src/graphql/data/fpt/schema.docs.graphql";
const schemaPath = new URL("../schema/github.graphql", import.meta.url);

const response = await fetch(schemaUrl, {
  headers: {
    "User-Agent": "Raycast GitHub extension schema updater",
  },
});

if (!response.ok) {
  throw new Error(`Failed to download GitHub GraphQL schema: ${response.status} ${response.statusText}`);
}

const schemaText = await response.text();
const schema = buildSchema(schemaText);
const repository = schema.getType("Repository");
const createIssueInput = schema.getType("CreateIssueInput");

if (
  !isObjectType(repository) ||
  !("issueTypes" in repository.getFields()) ||
  !isInputObjectType(createIssueInput) ||
  !("issueTypeId" in createIssueInput.getFields())
) {
  throw new Error("Downloaded schema does not include the GitHub Issue Types API");
}

await writeFile(schemaPath, schemaText);
console.log(`Updated ${schemaPath.pathname}`);
