import { Action, ActionPanel, Icon, launchCommand, LaunchType } from "@raycast/api";
import { Record, ProvidersHook } from "../hooks/useProvider";

export const getProviderActionSection = (
  hook: ProvidersHook,
  activeId: string | undefined,
  callback: (_arg0: Record) => void,
) => {
  const isSelecting = (record: Record) => {
    return activeId == record.id;
  };
  return (
    <ActionPanel.Submenu title="Provider" icon={Icon.Box} shortcut={{ modifiers: ["cmd", "ctrl"], key: "p" }}>
      <Action
        title="Edit..."
        icon={Icon.Pencil}
        onAction={async () => {
          launchCommand({
            name: "provider",
            type: LaunchType.UserInitiated,
          });
        }}
      />
      <ActionPanel.Section title="Provider List">
        {hook.data?.map((item) => (
          <Action
            title={item.props.name}
            key={item.id}
            icon={{ source: `ic_${item.type}.png` }}
            autoFocus={isSelecting(item)}
            onAction={async () => {
              //hook.setSelected(item);
              callback(item);
            }}
          />
        ))}
      </ActionPanel.Section>
    </ActionPanel.Submenu>
  );
};
