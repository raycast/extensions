import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import CustomAppForm from "../forms/custom-app-form";
import OpenProfileForm from "../forms/open-profile-form";
import { exportWithToast } from "../helpers/import-export";
import { ImportAppsForm } from "../import-apps";
import { AppEntry } from "../types";

const IMPORT_ICON = Icon.Download;
const EXPORT_ICON = Icon.Upload;

function ImportAppsAction({ shortcut }: { shortcut?: Keyboard.Shortcut }) {
  return (
    <Action.Push title="Import Apps…" icon={IMPORT_ICON} target={<ImportAppsForm popOnSuccess />} shortcut={shortcut} />
  );
}

function ExportAppsAction({ shortcut }: { shortcut?: Keyboard.Shortcut }) {
  return <Action title="Export Apps" icon={EXPORT_ICON} onAction={exportWithToast} shortcut={shortcut} />;
}

function ImportExportSection() {
  return (
    <ActionPanel.Section>
      <ImportAppsAction shortcut={{ modifiers: ["cmd", "shift"], key: "i" }} />
      <ExportAppsAction shortcut={{ modifiers: ["cmd", "shift"], key: "e" }} />
    </ActionPanel.Section>
  );
}

function AddCustomAppAction() {
  return (
    <Action.Push
      title="Add Custom App"
      icon={Icon.Plus}
      target={<CustomAppForm />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
}

interface AppManagementActionPanelsProps {
  /** Omit for the empty Custom Apps row */
  app?: AppEntry;
  onToggleVisible?: (app: AppEntry) => void;
  onDeleteCustomApp?: (app: AppEntry) => void;
}

export function AppManagementActionPanels({ app, onToggleVisible, onDeleteCustomApp }: AppManagementActionPanelsProps) {
  if (!app) {
    return (
      <ActionPanel>
        <AddCustomAppAction />
        <ImportExportSection />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <Action
        title={app.visible ? "Hide" : "Show"}
        icon={app.visible ? Icon.EyeDisabled : Icon.Eye}
        onAction={() => onToggleVisible?.(app)}
      />
      {app.visible && (
        <Action.Push
          title={`Open Profile on ${app.name}…`}
          icon={Icon.MagnifyingGlass}
          target={<OpenProfileForm initialApp={app.value} />}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      )}
      {!app.isDefault && (
        <ActionPanel.Section>
          <Action.Push
            title="Edit"
            icon={Icon.Pencil}
            target={<CustomAppForm app={app} />}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => onDeleteCustomApp?.(app)}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <AddCustomAppAction />
      </ActionPanel.Section>
      <ImportExportSection />
    </ActionPanel>
  );
}
