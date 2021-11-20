import { ActionPanel, ActionPanelItem, clearLocalStorage, Detail, useNavigation } from "@raycast/api";

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
          <ActionPanelItem
            title="Confirm"
            onAction={() =>
              clearLocalStorage().then(() => {
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
