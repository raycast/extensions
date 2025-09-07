import { ActionPanel, Action, List, LaunchProps, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { deleteSavedItem, getSavedItems, moveItem } from "./utilities/storage";
import { Entry, EntryCutPaste } from "./types";
import FormCutPaste from "./components/FormCutPaste";
import { performReplacement } from "./utilities/replacements";
import EntryForm from "./components/EntryForm";
import FormDirectReplace from "./components/FormDirectReplace";
import { nanoid } from "nanoid";

const tagOptions: Record<Entry["type"], { value: string; color?: Color.ColorLike }> = {
  directReplace: {
    value: "Direct Replace",
    color: Color.Green,
  },
  cutPaste: {
    value: "Cut Paste",
    color: Color.Magenta,
  },
};

export default function ManageOptions(props: Readonly<LaunchProps<{ draftValues: EntryCutPaste }>>) {
  const { data: replacementEntries, revalidate, isLoading } = usePromise(getSavedItems);

  return (
    <List
      navigationTitle="Regex replace options"
      isLoading={isLoading}
      actions={
        <ActionPanel title="Manage item">
          <Action.Push
            title="Create New"
            target={<EntryForm initialValues={props.draftValues ?? ({} as EntryCutPaste)} isNew />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onPop={revalidate}
          />
        </ActionPanel>
      }
    >
      {!!replacementEntries &&
        replacementEntries.map((option, index) => (
          <List.Item
            title={option.title}
            subtitle={option.description}
            accessories={[{ tag: tagOptions[option.type as Entry["type"]] }]}
            actions={
              <ActionPanel title="Manage item">
                <Action
                  title="Run and Paste"
                  onAction={async () => {
                    await performReplacement(option, "paste");
                    revalidate();
                  }}
                />
                <Action
                  title="Run and Copy"
                  onAction={async () => {
                    await performReplacement(option, "copy");
                    revalidate();
                  }}
                />
                <Action.Push
                  title="Create New"
                  target={<EntryForm initialValues={props.draftValues ?? ({} as EntryCutPaste)} isNew />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onPop={revalidate}
                />
                <Action.Push
                  title="Edit Item"
                  target={
                    option?.type === "cutPaste" ? (
                      <FormCutPaste initialValues={option} />
                    ) : (
                      <FormDirectReplace initialValues={option} />
                    )
                  }
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onPop={revalidate}
                />
                <Action.Push
                  title="Duplicate"
                  target={
                    <EntryForm
                      initialValues={{ ...option, id: nanoid(), title: option.title + " (duplicated)" }}
                      isNew
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onPop={revalidate}
                />
                <Action
                  title="Move up"
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  onAction={async () => {
                    if (index > 0) await moveItem(index, index - 1, revalidate);
                  }}
                />
                <Action
                  title="Move Down"
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  onAction={async () => {
                    if (index < replacementEntries.length - 1) await moveItem(index, index + 1, revalidate);
                  }}
                />
                <Action
                  title="Delete"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    await deleteSavedItem(option);
                    revalidate();
                  }}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
            key={option?.id ?? index}
          />
        ))}
    </List>
  );
}
