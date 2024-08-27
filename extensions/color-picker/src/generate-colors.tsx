import { AI, Action, ActionPanel, Grid, LaunchProps } from "@raycast/api";
import { showFailureToast, useAI } from "@raycast/utils";
import CopyAsSubmenu from "./components/CopyAsSubmenu";
import { addToHistory } from "./history";
import { getFormattedColor, getPreviewColor } from "./utils";

export default function GenerateColors(props: LaunchProps<{ arguments: Arguments.GenerateColors }>) {
  const { data, isLoading } = useAI(
    `Generate colors based on a prompt.

Please follow these rules:
- You MUST return an JSON array of HEX colors without any other characters. It should be PARSABLE and MINIFIED.
- Return an empty JSON array if it's not possible to generate colors.

Examples:
- ["#66D3BB","#7EDDC6","#96E7D1","#AEEFDB","#C6F9E6"]
- ["#0000CD","#0000FF","#1E90FF"]
- ["#FF0000","#FF6347","#FF7F50","#FF8C00","#FFA07A","#FFA500","#FFD700","#FFDEAD","#FFE4B5","#FFE4C4"]

Prompt: ${props.arguments.prompt}
JSON colors:`,
    {
      model: AI.Model.OpenAI_GPT4o,
      stream: false,
    },
  );

  let colors: string[] = [];
  try {
    colors = data ? (JSON.parse(data) as string[]) : [];
  } catch (error) {
    showFailureToast(error, { title: "Could not generate colors, please try again." });
  }

  return (
    <Grid columns={5} isLoading={isLoading}>
      {colors.map((c, index) => {
        const formattedColor = getFormattedColor(c);
        const previewColor = getPreviewColor(c);
        const color = { light: previewColor, dark: previewColor, adjustContrast: false };
        return (
          <Grid.Item
            key={index}
            content={{ color }}
            title={formattedColor}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={formattedColor} onCopy={() => addToHistory(formattedColor)} />
                <Action.Paste content={formattedColor} onPaste={() => addToHistory(formattedColor)} />
                <CopyAsSubmenu color={formattedColor} onCopy={() => addToHistory(formattedColor)} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
