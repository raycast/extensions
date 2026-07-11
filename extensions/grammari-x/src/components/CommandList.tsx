import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { CommandType } from "../types";

const fixGrammerCommandIcon = { source: Icon.Check, tintColor: Color.Green };
const paraphraseCommandIcon = { source: Icon.Pencil, tintColor: Color.Blue };
const toneChangeCommandIcon = { source: Icon.Raindrop, tintColor: Color.Orange };
const continueTextCommandIcon = { source: Icon.ShortParagraph, tintColor: Color.Yellow };

export default function CommandList({
  onExecute,
  searchText,
}: {
  onExecute: (command: CommandType) => void;
  searchText: string;
}) {
  return (
    <>
      {searchText ? (
        <List.Section title="Commands">
          <List.Item
            title="Fix grammer"
            icon={fixGrammerCommandIcon}
            actions={
              <ActionPanel>
                <Action title="Fix Grammer" onAction={async () => await onExecute(CommandType.Fix)} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Paraphrase"
            icon={paraphraseCommandIcon}
            actions={
              <ActionPanel>
                <Action title="Paraphrase" onAction={async () => await onExecute(CommandType.Paraphrase)} />
              </ActionPanel>
            }
          />

          <List.Item
            title="Tone Changer"
            icon={toneChangeCommandIcon}
            actions={
              <ActionPanel>
                <Action title="Tone Changer" onAction={async () => await onExecute(CommandType.ToneChange)} />
              </ActionPanel>
            }
          />

          <List.Item
            title="Continue Text"
            icon={continueTextCommandIcon}
            actions={
              <ActionPanel>
                <Action title="Continue Text" onAction={async () => await onExecute(CommandType.ContinueText)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <List.EmptyView icon={Icon.Code} title="Type something to fix grammer" />
      )}
    </>
  );
}
