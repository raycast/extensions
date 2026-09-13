import { ActionPanel, Keyboard } from "@raycast/api";
import { CopyToClipboardAction } from "./index";

export const CopyActionSection = ({ question, answer }: { question: string; answer: string }) => (
  <ActionPanel.Section title="Copy">
    {/* Two copy actions in one panel: the answer keeps Common.Copy, and the question
        takes CopyName so both stay reachable rather than colliding on ⌘⇧C. */}
    {answer ? (
      <CopyToClipboardAction title="Copy Answer" content={answer} shortcut={Keyboard.Shortcut.Common.Copy} />
    ) : null}
    {question ? (
      <CopyToClipboardAction title="Copy Question" content={question} shortcut={Keyboard.Shortcut.Common.CopyName} />
    ) : null}
  </ActionPanel.Section>
);
