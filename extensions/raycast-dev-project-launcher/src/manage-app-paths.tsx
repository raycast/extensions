import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import type { AppPathMapping, ProjectType } from "./types";
import {
  loadAppPathStore,
  removeAppPathMapping,
  upsertAppPathMapping,
  DEFAULT_APP_PATH_STORE,
} from "./lib/appPathStore";
import { iconForProjectType } from "./lib/projectIcons";
import { parseCommaSeparated } from "./lib/projectScanner";

/**
 * "Manage App Paths" — lists every project type currently known to the
 * store (builtin + any custom types the user has registered) and lets the
 * user add a brand-new type or edit/remove an existing mapping via a Form.
 */
export default function Command() {
  const { data: store, isLoading, revalidate } = usePromise(loadAppPathStore, []);
  const { push } = useNavigation();

  const entries = Object.entries(store ?? {}).sort(([a], [b]) => a.localeCompare(b));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search project types…">
      <List.Section title="Project Types" subtitle={`${entries.length} configured`}>
        {entries.map(([type, mapping]) => (
          <List.Item
            key={type}
            icon={iconForProjectType(type)}
            title={type}
            subtitle={summarize(mapping)}
            accessories={isBuiltin(type) ? [{ tag: "Builtin" }] : [{ tag: "Custom" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Mapping"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<AppPathForm existingType={type} existingMapping={mapping} onSaved={revalidate} />)
                  }
                />
                <Action
                  title="Add New Project Type"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<AppPathForm onSaved={revalidate} />)}
                />
                {!isBuiltin(type) && (
                  <Action
                    title="Remove Custom Type"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: `Remove "${type}"?`,
                        message:
                          "This deletes the custom app-path mapping. Projects detected as this type will fall back to global defaults.",
                        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                      });
                      if (!confirmed) return;
                      await removeAppPathMapping(type);
                      await showToast({ style: Toast.Style.Success, title: `Removed "${type}"` });
                      revalidate();
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Add New Project Type…"
          actions={
            <ActionPanel>
              <Action
                title="Add New Project Type"
                icon={Icon.Plus}
                onAction={() => push(<AppPathForm onSaved={revalidate} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function isBuiltin(type: ProjectType): boolean {
  return type in DEFAULT_APP_PATH_STORE;
}

function summarize(mapping: AppPathMapping): string {
  const parts: string[] = [];
  if (mapping.markers?.length) parts.push(`Markers: ${mapping.markers.join(", ")}`);
  if (mapping.preferred) parts.push(`Preferred: ${mapping.preferred}`);
  if (mapping.vscode) parts.push(`VS Code: ${mapping.vscode}`);
  if (mapping.webstorm) parts.push(`WebStorm: ${mapping.webstorm}`);
  if (mapping.iterm) parts.push(`iTerm: ${mapping.iterm}`);
  return parts.length > 0 ? parts.join("  ·  ") : "No paths configured yet";
}

interface AppPathFormProps {
  existingType?: ProjectType;
  existingMapping?: AppPathMapping;
  onSaved: () => void;
}

function AppPathForm({ existingType, existingMapping, onSaved }: AppPathFormProps) {
  const { pop } = useNavigation();
  const isEditing = Boolean(existingType);
  const [typeNameError, setTypeNameError] = useState<string | undefined>();

  async function handleSubmit(values: {
    typeName: string;
    // Absent for builtin types, whose markers are fixed in the detector.
    markers?: string;
    preferred: string;
    vscode: string;
    webstorm: string;
    iterm: string;
  }) {
    const typeName = values.typeName.trim();
    if (!typeName) {
      setTypeNameError("Project type name is required");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(typeName)) {
      setTypeNameError("Use letters, numbers, and hyphens only (e.g. deno, unity3d)");
      return;
    }
    setTypeNameError(undefined);

    const markers = parseCommaSeparated(values.markers);

    const mapping: AppPathMapping = {
      markers: markers.length > 0 ? markers : undefined,
      preferred: values.preferred.trim() || undefined,
      vscode: values.vscode.trim() || undefined,
      webstorm: values.webstorm.trim() || undefined,
      iterm: values.iterm.trim() || undefined,
    };

    const normalizedType = typeName.toLowerCase();

    // If the user renamed a custom type, remove the old key first.
    if (isEditing && existingType && existingType !== normalizedType) {
      await removeAppPathMapping(existingType);
    }

    await upsertAppPathMapping(normalizedType, mapping);
    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? `Updated "${normalizedType}"` : `Added "${normalizedType}"`,
    });
    onSaved();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Add Project Type"}
            onSubmit={handleSubmit}
            icon={Icon.Checkmark}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          isEditing
            ? "Update the executable/app paths used to open this project type."
            : "Register a new project type and the executable/app paths used to open it. This mapping is stored locally and persists across restarts."
        }
      />
      <Form.TextField
        id="typeName"
        title="Project Type"
        placeholder="e.g. deno, unity3d, react-native"
        defaultValue={existingType ?? ""}
        error={typeNameError}
        onChange={() => setTypeNameError(undefined)}
      />
      {!isEditing || !isBuiltin(existingType ?? "") ? (
        <Form.TextField
          id="markers"
          title="Marker Files"
          placeholder="deno.json,deno.jsonc"
          defaultValue={(existingMapping?.markers ?? []).join(",")}
          info="Comma-separated file or folder names that identify this project type. Without them a custom type is never matched while scanning."
        />
      ) : null}
      <Form.Separator />
      <Form.TextField
        id="preferred"
        title="Preferred App"
        placeholder="/Applications/Xcode.app  or  code"
        defaultValue={existingMapping?.preferred ?? ""}
        info="Used by the primary Open action (Enter) for this project type. Leave empty to fall back to VS Code."
      />
      <Form.TextField
        id="vscode"
        title="VS Code Path"
        placeholder="code  or  /Applications/Visual Studio Code.app"
        defaultValue={existingMapping?.vscode ?? ""}
        info="A bare command (resolved via PATH) or an absolute path to a binary or .app bundle."
      />
      <Form.TextField
        id="webstorm"
        title="WebStorm Path"
        placeholder="webstorm  or  /Applications/WebStorm.app"
        defaultValue={existingMapping?.webstorm ?? ""}
        info="Works for any JetBrains IDE — swap in idea, pycharm, goland, clion, rubymine, etc."
      />
      <Form.TextField
        id="iterm"
        title="iTerm Path"
        placeholder="/Applications/iTerm.app"
        defaultValue={existingMapping?.iterm ?? "/Applications/iTerm.app"}
        info="Absolute path to the iTerm.app bundle (or its display name)."
      />
    </Form>
  );
}
