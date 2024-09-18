import { Action, ActionPanel, Icon } from "@raycast/api";
import capitalize from "capitalize";
import { TranslateMode } from "../providers/types";

const table: [TranslateMode, Icon][] = [
  ["translate", Icon.Book],
  ["polishing", Icon.Pencil],
  ["summarize", Icon.AlignCentre],
  ["what", Icon.QuestionMark],
];

export const getModeActionSection = (callback: (_arg0: TranslateMode) => void) => (
  <ActionPanel.Submenu title="Mode" icon={Icon.Paragraph} shortcut={{ modifiers: ["cmd"], key: "m" }}>
    {table.map((m) => (
      <Action
        title={capitalize(m[0])}
        icon={m[1]}
        key={m[0]}
        onAction={() => {
          callback(m[0]);
        }}
      />
    ))}
  </ActionPanel.Submenu>
);
