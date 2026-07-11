import { ActionPanel, Action, Detail, useNavigation, Icon } from "@raycast/api";
import { Variable, ModesMap, ColorValue } from "./interfaces";

interface VariableDetailProps {
  variable: Variable;
  allVariables: Variable[];
  modesMap: ModesMap;
}

const VariableDetail: React.FC<VariableDetailProps> = ({ variable, allVariables, modesMap }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { pop } = useNavigation();
  const resolveAliasName = (aliasId: string): string => {
    const foundVariable = allVariables.find((v) => v.id === aliasId);
    return foundVariable ? foundVariable.name : "Unknown";
  };

  const markdown = `
# ${variable.name}
**Type**: \`${variable.resolvedType}\`\n
---\n
**Description**\n
${variable.description}\n
---\n
**Values by Mode**\n
${Object.entries(variable.valuesByMode)
  .map(([modeId, value]) => {
    const modeName = modesMap[modeId] || "Unknown Mode";
    let displayValue: string;

    if (typeof value === "object" && value !== null && "type" in value && value.type === "VARIABLE_ALIAS") {
      displayValue = resolveAliasName(value.id);
    } else if (typeof value === "object" && "r" in value && "g" in value && "b" in value && "a" in value) {
      const colorValue: ColorValue = value as ColorValue;
      displayValue = `rgba(${Math.round(colorValue.r * 255)}, ${Math.round(colorValue.g * 255)}, ${Math.round(colorValue.b * 255)}, ${colorValue.a})`;
    } else if (typeof value === "number") {
      displayValue = value.toString();
    } else if (typeof value === "string") {
      displayValue = value;
    } else if (typeof value === "boolean") {
      displayValue = value ? "True" : "False";
    } else {
      displayValue = "Unknown";
    }
    return `**${modeName}:** \`${displayValue}\` \n`;
  })
  .join("\n")}

  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Details for ${variable.name}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Code Syntax WEB">
            <Detail.Metadata.TagList.Item text={variable.codeSyntax?.WEB || "N/A"} color="#2E4AD5" />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Code Syntax iOS">
            <Detail.Metadata.TagList.Item text={variable.codeSyntax?.iOS || "N/A"} color="#ffffff" />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Code Syntax Android">
            <Detail.Metadata.TagList.Item text={variable.codeSyntax?.ANDROID || "N/A"} color="#6BD488" />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Code Syntax (WEB)"
              icon={Icon.Clipboard}
              content={variable.codeSyntax?.WEB || "N/A"}
              shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
            />
            <Action.CopyToClipboard
              title="Copy Code Syntax (iOS)"
              icon={Icon.Clipboard}
              content={variable.codeSyntax?.iOS || "N/A"}
              shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
            />
            <Action.CopyToClipboard
              title="Copy Code Syntax (Android)"
              icon={Icon.Clipboard}
              content={variable.codeSyntax?.ANDROID || "N/A"}
              shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default VariableDetail;
