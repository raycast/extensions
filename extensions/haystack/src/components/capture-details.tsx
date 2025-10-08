import { Action, ActionPanel, Detail } from "@raycast/api";
import { type Capture, type CaptureData, StackFieldTypeEnum } from "../types";
import { formatDate, formatTime } from "../utils/date-formatter";

type FieldRenderer = (value: string) => string;

const FIELD_RENDERERS: Record<string, FieldRenderer> = {
  [StackFieldTypeEnum.NUMBER]: (value) => Number(value).toString(),
  [StackFieldTypeEnum.DATE]: (value) => formatDate(value),
  [StackFieldTypeEnum.TIME]: (value) => formatTime(value),
  [StackFieldTypeEnum.CURRENCY]: (value) => value,
  [StackFieldTypeEnum.BOOLEAN]: (value) => (value === "true" ? "`Yes`" : "`No`"),
  [StackFieldTypeEnum.TEXT]: (value) => value,
};

export const CaptureDetails = ({ capture }: { capture: Capture }) => {
  const renderCaptureData = (data: CaptureData): string => {
    const lines: string[] = [];

    for (const [key, { value, type }] of Object.entries(data)) {
      const renderer = FIELD_RENDERERS[type] || ((v) => v);
      lines.push(`**${key}:** ${renderer(value)}`);
    }

    return lines.join("\n\n");
  };

  const markdown = `
![Screenshot](file://${capture.imagePath.replace(" ", "%20")})

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
