import { AI, Action, ActionPanel, Detail, environment } from "@raycast/api";
import { useAI } from "@raycast/utils";

const OBLIQUE_PROMPT =
  "Create a new oblique strategy in the vain of Brian Eno and Peter Schmidt. Only reply with the short suggestion, nothing else.";

export default function Command() {
  const { data, isLoading } = useAI(OBLIQUE_PROMPT, { execute: environment.canAccess(AI) });

  return (
    <Detail
      isLoading={isLoading}
      markdown={data || "You don't have AI access :("}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={data} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.Paste content={data} shortcut={{ modifiers: ["cmd"], key: "v" }} />
        </ActionPanel>
      }
    />
  );
}
