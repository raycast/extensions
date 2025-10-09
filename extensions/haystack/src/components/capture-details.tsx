import { Action, ActionPanel, Detail } from "@raycast/api";
import type { Capture, CaptureData } from "../types";

export const CaptureDetails = ({ capture }: { capture: Capture }) => {
  const renderCaptureData = (data: CaptureData): string => {
    const lines: string[] = [];

    for (const [key, { value }] of Object.entries(data)) {
      lines.push(`**${key}:** ${value}`);
    }

    return lines.join("\n\n");
  };

  const markdown = `
![Screenshot](file://${encodeURI(capture.imagePath)})

## ${capture.title}
${renderCaptureData(capture.data)}

_Captured in ${capture.stackName}_
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.ShowInFinder path={capture.imagePath} />
        </ActionPanel>
      }
    />
  );
};
