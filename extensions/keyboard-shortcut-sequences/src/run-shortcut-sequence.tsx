import { List, LocalStorage, ActionPanel, Action, Icon, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import SequenceForm from "./components/SequenceForm";
import { Sequence } from "./types";
import { runShortcutSequence } from "./utils";

export default function Command(props: { arguments: { sequenceName: string } }) {
  const { sequenceName } = props.arguments;
  const [sequences, setSequences] = useState<Sequence[]>();

  useEffect(() => {
    LocalStorage.allItems().then((items) => {
      setSequences(Object.values(items).map((value) => JSON.parse(value)));
    });
  }, []);

  if (sequenceName.length != 0) {
    let didRunSequence: Sequence | undefined = undefined;
    if (sequences) {
      for (let index = 0; index < sequences.length; index++) {
        const sequence = sequences[index];
        if (sequence.name == sequenceName) {
          Promise.resolve(runShortcutSequence(sequence));
          didRunSequence = sequence;
          break;
        }
      }
    }

    if (didRunSequence) {
      return null;
    }
  }

  const listItems = sequences?.map((sequence) => (
    <List.Item
      key={sequence.name}
      title={sequence.name}
      icon={sequence.icon}
      subtitle={sequence.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="General">
            <Action
              title="Run Shortcut Sequence"
              icon={Icon.ArrowRightCircle}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => {
                Promise.resolve(runShortcutSequence(sequence));
              }}
            />
            <Action.CopyToClipboard
              title="Copy JSON Representation"
              content={JSON.stringify(sequence)}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Sequence Controls">
            <Action.CreateQuicklink
              quicklink={{
                name: sequence.name,
                link: `raycast://extensions/HelloImSteven/keyboard-shortcut-sequences/run-shortcut-sequence?arguments=%7B%22sequenceName%22%3A%22${encodeURI(
                  sequence.name
                ).replaceAll("&", "%26")}%22%7D`,
              }}
            />
            <Action.Push
              title="Edit Sequence"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<SequenceForm sequence={sequence} setSequences={setSequences} />}
            />
            <Action
              title="Delete Sequence"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Sequence",
                    message: "Are you sure?",
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  })
                ) {
                  const newSequences = sequences.filter((seq) => seq.name != sequence.name);
                  setSequences(newSequences);
                  await LocalStorage.removeItem(sequence.name);
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  ));

  return (
    <List
      searchBarPlaceholder="Search shortcut sequences..."
      searchText={sequenceName ? sequenceName : undefined}
      isLoading={sequences == undefined}
    >
      <List.EmptyView title="No Shortcut Sequences" icon={{ source: "no-view.png" }} />
      {listItems}
    </List>
  );
}
