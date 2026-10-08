import { ActionPanel, Detail, useNavigation, Action, LocalStorage } from "@raycast/api";

export default function ClearLocalStorage({
  onExit = () => {
    return;
  },
}) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle="Clear All Display Presets"
      actions={
        <ActionPanel>
          <Action
            title="Confirm"
            onAction={() =>
              LocalStorage.clear().then(() => {
                pop();
                onExit();
              })
            }
          />
        </ActionPanel>
      }
      markdown={`
  # 🚨 Are you sure?
  This cannot be undone.
  `}
    />
  );
}
