import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FILE_TYPES, ICON_OPTIONS, type FileType } from "./lib/file-types.js";
import { loadCustomTypes, saveCustomTypes } from "./lib/file-types-store.js";

function parseExtensions(raw: string): string[] {
  return raw
    .split(/[;,\s]+/)
    .map((s) => s.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
}

export default function ManageTypesCommand() {
  const [custom, setCustom] = useState<FileType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadCustomTypes().then((c) => {
      setCustom(c);
      setLoaded(true);
    });
  }, []);

  const upsert = async (t: FileType) => {
    const exists = custom.some((x) => x.id === t.id);
    const next = exists
      ? custom.map((x) => (x.id === t.id ? t : x))
      : [...custom, t];
    setCustom(next);
    await saveCustomTypes(next);
    await showToast({
      style: Toast.Style.Success,
      title: exists ? "Type updated" : "Type created",
      message: t.label,
    });
  };

  const remove = async (id: string) => {
    const next = custom.filter((x) => x.id !== id);
    setCustom(next);
    await saveCustomTypes(next);
  };

  const addForm = (
    <TypeForm onSubmit={upsert} nextId={`custom-${Date.now()}`} />
  );

  return (
    <List isLoading={!loaded}>
      <List.Section title={`Custom Types (${custom.length})`}>
        <List.Item
          icon={Icon.Plus}
          title="Add Custom Type"
          subtitle="e.g. Design: ai;fig;sketch;xd"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Custom Type"
                icon={Icon.Plus}
                target={addForm}
              />
            </ActionPanel>
          }
        />
        {custom.map((t) => (
          <List.Item
            key={t.id}
            icon={t.icon}
            title={t.label}
            subtitle={t.extensions?.join(" / ") ?? ""}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Edit ${t.label}`}
                  icon={Icon.Pencil}
                  target={
                    <TypeForm onSubmit={upsert} initial={t} nextId={t.id} />
                  }
                />
                <Action
                  title={`Delete ${t.label}`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => remove(t.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Built-in Types (toggle in Extension Preferences)">
        {FILE_TYPES.map((t) => (
          <List.Item
            key={t.id}
            icon={t.icon}
            title={t.label}
            subtitle={
              t.id === "all"
                ? "no filtering"
                : (t.extensions?.slice(0, 10).join(" / ") ?? "")
            }
          />
        ))}
        <List.Item
          icon={Icon.Gear}
          title="Open Extension Preferences to toggle built-in types…"
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => openExtensionPreferences()}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function TypeForm({
  onSubmit,
  initial,
  nextId,
}: {
  onSubmit: (t: FileType) => Promise<void>;
  initial?: FileType;
  nextId: string;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={
        initial ? `Edit Type: ${initial.label}` : "Add Custom Type"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={initial ? "Save Changes" : "Create Type"}
            onSubmit={async (values: {
              label: string;
              icon: string;
              extensions: string;
            }) => {
              const exts = parseExtensions(values.extensions);
              if (!values.label?.trim() || exts.length === 0) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Name and extensions are required",
                });
                return;
              }
              await onSubmit({
                id: nextId,
                label: values.label.trim(),
                icon: values.icon || ICON_OPTIONS[0].value,
                extensions: exts,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="label"
        title="Name"
        placeholder="e.g. Design"
        defaultValue={initial?.label ?? ""}
      />
      <Form.TextField
        id="extensions"
        title="Extensions (separated by ; or ,)"
        placeholder="ai;fig;sketch;xd"
        defaultValue={initial?.extensions?.join(";") ?? ""}
      />
      <Form.Dropdown
        id="icon"
        title="Icon"
        defaultValue={initial?.icon ?? ICON_OPTIONS[0].value}
      >
        {ICON_OPTIONS.map((o) => (
          <Form.Dropdown.Item
            key={o.value}
            title={o.label}
            value={o.value}
            icon={o.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Note"
        text="Saved types appear in the search command's type dropdown immediately."
      />
    </Form>
  );
}
