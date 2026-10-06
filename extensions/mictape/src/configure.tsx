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
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useState } from "react";
import { showError } from "./lib/errors";
import {
  addDestination,
  DestinationRule,
  getConfig,
  previewFilename,
  removeDestination,
  setFilename,
} from "./lib/mictape";

const TOKENS_HELP =
  "Tokens: {label} (asked when you start recording), {date:yyyyMMdd}, {date:HHmm} and other date patterns.";

const tilde = (path: string) => (path.startsWith(homedir()) ? "~" + path.slice(homedir().length) : path);
const isGlob = (path: string) => /[*?[{]/.test(path);
const describe = (rule: DestinationRule) => (rule.subdirectory ? `${rule.path} + ${rule.subdirectory}` : rule.path);

function FilenameForm({ current, onSaved }: { current: string; onSaved: () => void }) {
  const [template, setTemplate] = useState(current);
  const { data: preview, isLoading } = usePromise(previewFilename, [template]);
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="File Name"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save File Name"
            icon={Icon.Check}
            onSubmit={async () => {
              try {
                await setFilename(template.trim());
                await showToast({ style: Toast.Style.Success, title: "File name saved" });
                onSaved();
                pop();
              } catch (error) {
                await showError("Could not save the file name", error);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="template"
        title="Template"
        value={template}
        onChange={setTemplate}
        error={preview?.error}
        info={TOKENS_HELP}
      />
      <Form.Description title="Example" text={preview?.example ?? "—"} />
    </Form>
  );
}

function DestinationForm({ onSaved }: { onSaved: () => void }) {
  const [error, setError] = useState<string>();
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Add Destination"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Destination"
            icon={Icon.Plus}
            onSubmit={async (values: { folder: string[]; pattern: string; subdirectory: string }) => {
              const typed = values.pattern.trim();
              const picked = values.folder[0];
              const path = typed || (picked ? tilde(picked) : "");
              if (!path) {
                setError("Choose a folder or enter a path");
                return;
              }
              try {
                await addDestination({ path, subdirectory: values.subdirectory.trim() || undefined });
                await showToast({ style: Toast.Style.Success, title: "Destination added", message: path });
                onSaved();
                pop();
              } catch (e) {
                await showError("Could not add the destination", e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        onChange={() => setError(undefined)}
      />
      <Form.TextField
        id="pattern"
        title="Or Path / Glob"
        placeholder="~/Documents/Classes/[0-9]*-?*"
        info="Use a glob to turn every matching folder into a destination. Takes priority over the folder above."
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.TextField
        id="subdirectory"
        title="Subfolder"
        placeholder="audio (optional)"
        info="Appended to each destination and created when recording starts."
      />
    </Form>
  );
}

export default function Command() {
  const {
    data: config,
    isLoading,
    revalidate,
  } = usePromise(getConfig, [], {
    onError: (e) => showError("Could not read the mictape config", e),
  });
  const { data: preview } = usePromise(previewFilename, [config?.filename ?? ""], {
    execute: Boolean(config),
  });

  const addAction = (
    <Action.Push title="Add Destination…" icon={Icon.Plus} target={<DestinationForm onSaved={revalidate} />} />
  );
  const openConfig = config?.exists ? (
    <Action.Open
      title="Open Config File"
      icon={Icon.Document}
      target={config.path}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  ) : null;

  return (
    <List isLoading={isLoading} navigationTitle="Recording Settings">
      {config && (
        <List.Section title="File Name">
          <List.Item
            icon={Icon.Text}
            title={config.filename}
            subtitle={preview?.example ? `e.g. ${preview.example}` : undefined}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit File Name"
                  icon={Icon.Pencil}
                  target={<FilenameForm current={config.filename} onSaved={revalidate} />}
                />
                {openConfig}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {config && (
        <List.Section title="Destinations" subtitle={String(config.destinations.length)}>
          {config.destinations.length === 0 && (
            <List.Item
              icon={Icon.Plus}
              title="Add a destination"
              actions={
                <ActionPanel>
                  {addAction}
                  {openConfig}
                </ActionPanel>
              }
            />
          )}
          {config.destinations.map((rule) => (
            <List.Item
              key={describe(rule)}
              icon={isGlob(rule.path) ? Icon.AppWindowGrid3x3 : Icon.Folder}
              title={rule.path}
              subtitle={rule.subdirectory ? `+ ${rule.subdirectory}` : undefined}
              accessories={isGlob(rule.path) ? [{ tag: "glob" }] : []}
              actions={
                <ActionPanel>
                  {addAction}
                  <Action
                    title="Remove Destination"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      const ok = await confirmAlert({
                        title: "Remove this destination?",
                        message: `${describe(rule)}\n\nRecordings already saved there are not touched.`,
                        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                      });
                      if (!ok) return;
                      try {
                        await removeDestination(rule);
                        await showToast({ style: Toast.Style.Success, title: "Destination removed" });
                        revalidate();
                      } catch (e) {
                        await showError("Could not remove the destination", e);
                      }
                    }}
                  />
                  {!isGlob(rule.path) && <Action.ShowInFinder path={rule.path.replace(/^~(?=$|\/)/, homedir())} />}
                  {openConfig}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
