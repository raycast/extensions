import { List } from "@raycast/api";
import { argumentDefault } from "../lib/commands";
import { ConsoleCommand } from "../types";

export const DetailsView = ({ command }: { command: ConsoleCommand }) => (
  <List.Item.Detail markdown={buildMarkdown(command)} />
);

const optionValue = (valueRequired: boolean, valueOptional: boolean) => {
  if (valueRequired) return "requires a value";
  return valueOptional ? "value optional" : "no value";
};

const block = (lines: string[]) => `\`\`\`text\n${lines.join("\n")}\n\`\`\`\n`;

const buildMarkdown = ({ description, synopsis, options, arguments: args }: ConsoleCommand) => {
  const sections = [description, `### Usage\n\n\`\`\`bash\n${synopsis}\n\`\`\``];
  if (options?.length) {
    const lines = options.map(({ name, description, value_required, value_optional }) =>
      block([`--${name}`, `- ${optionValue(value_required, value_optional)}`, `- ${description}`]),
    );
    sections.push(`### Options\n---\n\n${lines.join("")}`);
  }
  if (args?.length) {
    const lines = args.map(({ name, description, required, default: value }) => {
      const defaultValue = argumentDefault(value);
      return block([
        `<${name}>`,
        `- ${required ? "required" : "optional"}${defaultValue ? `, default: ${defaultValue}` : ""}`,
        `- ${description}`,
      ]);
    });
    sections.push(`### Arguments\n---\n\n${lines.join("")}`);
  }
  return sections.join("\n\n");
};
