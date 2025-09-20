import { List } from "@raycast/api";
import { ConsoleCommand } from "../types";

export const DetailsView = ({ command }: { command: ConsoleCommand }) => (
  <List.Item.Detail markdown={buildMarkdown(command)} />
);

const buildMarkdown = ({ description, synopsis, options, arguments: args }: Partial<ConsoleCommand>) => {
  return `${description}
  \n\n### Usage
  \n\`\`\`bash
  \n${synopsis}
  \n\`\`\`
  \n\n${
    options?.length
      ? `### Options
  ---

  ${options
    ?.map(({ name, description, value_required, value_optional }, i) => {
      const value = value_required ? "required" : "optional";
      const valueDescription = value_optional ? "value required" : "value optional";
      return `\`\`\`text${i === 0 ? "\n" : ""}
<${name}>
- ${value}, ${valueDescription}
- ${description}
\`\`\`\n`;
    })
    .join("")}`
      : ""
  }

  ${
    args?.length
      ? `### Arguments
  ---

  ${args
    ?.map(({ name, description, required, default: defaultValue }, i) => {
      const value = required ? "required" : "optional";
      const valueDescription = defaultValue ? `default: ${defaultValue}` : "value optional";
      return `\`\`\`text${i === 0 ? "\n" : ""}
--${name}
- ${value}, ${valueDescription}
- ${description}
\`\`\`\n`;
    })
    .join("")}`
      : ""
  }`;
};
