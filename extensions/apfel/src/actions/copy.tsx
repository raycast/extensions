import { ActionPanel } from "@raycast/api";
import { CopyToClipboardAction } from "./index";

export const CopyActionSection = ({ question, answer }: { question: string; answer: string }) => (
  <ActionPanel.Section title="Copy">
    {answer ? <CopyToClipboardAction title="Copy Answer" content={answer} /> : null}
    {question ? <CopyToClipboardAction title="Copy Question" content={question} /> : null}
  </ActionPanel.Section>
);
