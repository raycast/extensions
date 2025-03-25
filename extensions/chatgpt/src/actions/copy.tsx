import { ActionPanel } from "@raycast/api";
import { CopyToClipboardAction } from "./index";

export const CopyActionSection = ({ question, answer }: { question: string; answer: string }) => (
  <ActionPanel.Section title="Copy">
    <CopyToClipboardAction title="Copy Answer" content={answer} />
    <CopyToClipboardAction title="Copy Question" content={question} />
  </ActionPanel.Section>
);
