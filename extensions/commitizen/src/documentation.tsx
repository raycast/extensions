import { Detail } from "@raycast/api";
import { commitTypes, formFields } from "./data";
import { Keys } from "./types";

const commitTypesMarkdown = Object.keys(commitTypes)
  .map((key) => {
    const { description } = commitTypes[key as Keys];

    return `- **${key}**: ${description}`;
  })
  .join("\n");

const commitValuesMarkdown = Object.keys(formFields)
  .map((key) => {
    return `- **${key}**: ${formFields[key as keyof typeof formFields].description}`;
  })
  .join("\n");

const markdown = `
# Documentation

## Commit Types
${commitTypesMarkdown}
---
## Commit Values
${commitValuesMarkdown}
`;

export default function Documentation() {
  return <Detail markdown={markdown} />;
}
