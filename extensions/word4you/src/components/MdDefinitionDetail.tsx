import { List } from "@raycast/api";
import { MdDefinition } from "../types";

interface MdDefinitionDetailProps {
  mdDefinition: MdDefinition;
}

export function MdDefinitionDetail({ mdDefinition }: MdDefinitionDetailProps) {
  const markdown = `
# ${mdDefinition.text}
${mdDefinition.pronunciation ? `\n*/${mdDefinition.pronunciation}/*` : ""}
${mdDefinition.definition ? `\n*${mdDefinition.definition}*` : ""}
${mdDefinition.chinese ? `\n*${mdDefinition.chinese}*` : ""}
${mdDefinition.example_en ? `\n> _${mdDefinition.example_en}_` : ""}
${mdDefinition.example_zh ? `\n> _${mdDefinition.example_zh}_` : ""}
${mdDefinition.tip ? `\n💡*${mdDefinition.tip}*` : ""}
`;

  return <List.Item.Detail markdown={markdown} />;
}
