import { Action, ActionPanel, Icon } from "@raycast/api";
import { AskBackend, askBackends } from "../lib/agent-settings";

export type BackendChange = (
  backend: AskBackend,
  query: string,
) => Promise<void>;

export default function BackendMenu({
  backend,
  query,
  onChange,
}: {
  backend: AskBackend;
  query: string;
  onChange: BackendChange;
}) {
  return (
    <ActionPanel.Submenu
      title="Switch AI Backend"
      icon={Icon.Network}
      shortcut={{
        Windows: { modifiers: ["ctrl", "shift"], key: "b" },
        macOS: { modifiers: ["cmd", "shift"], key: "b" },
      }}
    >
      {askBackends.map((item) => (
        <Action
          key={item.value}
          title={
            item.value === backend ? `${item.title} (Current)` : item.title
          }
          icon={item.value === backend ? Icon.Checkmark : Icon.Network}
          onAction={() => onChange(item.value, query)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
