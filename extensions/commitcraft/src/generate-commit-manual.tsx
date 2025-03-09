import { Action, ActionPanel, Color, List, useNavigation } from "@raycast/api";
import { COMMIT_TYPES } from "./constants";
import { CommitForm } from "./components/commit-form";

export default function GenerateCommitManual() {
  const { push } = useNavigation();

  return (
    <List searchBarPlaceholder="Search Commit Type">
      {COMMIT_TYPES.map(({ label, value, icon }) => (
        <List.Item
          key={value}
          title={label}
          icon={icon}
          accessories={[{ tag: { value: value, color: Color.Green } }]}
          actions={
            <ActionPanel>
              <Action
                title="Select"
                onAction={() => {
                  push(<CommitForm type={value} />);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
