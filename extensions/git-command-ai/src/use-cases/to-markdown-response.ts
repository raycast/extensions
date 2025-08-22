import { OutputSchema } from "./create-provider-model";

export function toMarkdownResponse(response: OutputSchema) {
  const description = `\`\`\`\n${response.command}\n\`\`\`\n\n${response.description}`;

  return {
    description,
    command: response.command,
  };
}
