import { Action, ActionPanel, Icon } from "@raycast/api";
import CustomAppForm from "../forms/custom-app-form";
import OpenProfileForm from "../forms/open-profile-form";
import { AppItem } from "../types";

interface AppManagementActionPanelsProps {
  type: "default" | "custom" | "empty";
  app?: AppItem;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onDeleteCustomApp?: (app: AppItem) => void;
  onSave: () => void;
}

export function AppManagementActionPanels({
  type,
  app,
  onToggleEnabled,
  onDeleteCustomApp,
  onSave,
}: AppManagementActionPanelsProps) {
  if (type === "empty") {
    return (
      <ActionPanel>
        <Action.Push title="Add Custom Social App" icon={Icon.Plus} target={<CustomAppForm onSave={onSave} />} />
      </ActionPanel>
    );
  }

  if (type === "custom" && app) {
    return (
      <ActionPanel>
        <Action
          title={app.enabled ? "Hide" : "Show"}
          icon={app.enabled ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => onToggleEnabled?.(app.id, !app.enabled)}
        />
        <Action.Push
          title={`Open Profile on ${app.name}…`}
          icon={Icon.MagnifyingGlass}
          target={<OpenProfileForm initialApp={app.value} />}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <ActionPanel.Section>
          <Action.Push
            title="Edit"
            icon={Icon.Pencil}
            target={
              <CustomAppForm
                app={{
                  id: app.id,
                  name: app.name,
                  urlTemplate: app.urlTemplate,
                  enabled: app.enabled,
                }}
                onSave={onSave}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => onDeleteCustomApp?.(app)}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.Push
            title="Add Custom Social App"
            icon={Icon.Plus}
            target={<CustomAppForm onSave={onSave} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  if (type === "default" && app) {
    return (
      <ActionPanel>
        <Action
          title={app.enabled ? "Hide" : "Show"}
          icon={app.enabled ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => onToggleEnabled?.(app.id, !app.enabled)}
        />
        <Action.Push
          title={`Open Profile on ${app.name}…`}
          icon={Icon.MagnifyingGlass}
          target={<OpenProfileForm initialApp={app.value} />}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <ActionPanel.Section>
          <Action.Push
            title="Add Custom Social App"
            icon={Icon.Plus}
            target={<CustomAppForm onSave={onSave} />}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return <ActionPanel />;
}
