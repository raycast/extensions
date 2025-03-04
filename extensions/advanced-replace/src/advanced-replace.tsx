import { ActionPanel, Action, List, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { deleteSavedItem, getSavedItems } from "./utilities/storage";
import { ReplacementOption } from "./types";
import RegexItemForm from "./components/RegexItemForm";
import { performReplacement } from "./utilities/replacements";

export default function ManageOptions(props: Readonly<LaunchProps<{ draftValues: ReplacementOption }>>) {
  const { data: replacementOptions, revalidate, isLoading } = usePromise(getSavedItems);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Regex replace options"
      actions={
        <ActionPanel title="Manage item">
          <Action.Push
            title="Create New"
            target={<RegexItemForm initialValues={props.draftValues ?? ({} as ReplacementOption)} isNew />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onPop={revalidate}
          />
        </ActionPanel>
      }
    >
      {!!replacementOptions &&
        replacementOptions.map((option, index) => (
          <List.Item
            title={option.title}
            subtitle={option.description}
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
                  target={<RegexItemForm initialValues={props.draftValues ?? ({} as ReplacementOption)} isNew />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onPop={revalidate}
                />
                <Action.Push
                  title="Edit Item"
                  target={<RegexItemForm initialValues={option} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onPop={revalidate}
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
