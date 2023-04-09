import { CopyToClipboardActionProps } from "../types";
import { ActionPanel, Action } from "@raycast/api";
import { FC } from "react";

export const CopyToClipboardAction = (props: Action.CopyToClipboard.Props) => <Action.CopyToClipboard {...props} />;

export const CopyActionSection: FC<CopyToClipboardActionProps> = ({ question, answer }) => (
  <ActionPanel.Section title="Copy">
    <CopyToClipboardAction title="Copy Answer" content={answer} />
    <CopyToClipboardAction title="Copy Question" content={question} />
  </ActionPanel.Section>
);
