import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo, useState } from "react";
import { Preset, normalizeExt } from "./lib/extensions";
import { HandlerInfo, fetchAppMap, fetchCurrentHandlers } from "./lib/handlers";
import { appsSignature, runDiscovery } from "./lib/discovery";
import {
  getCustomExts,
  getDiscoveredExts,
  getUserPresets,
  setCustomExts,
  setDiscoveredExts,
  setUserPresets,
} from "./lib/storage";

export default function ManagePresets() {
  const { push } = useNavigation();
  const [userPresets, setUserPresetsState] = useState<Preset[]>([]);
  const [customExts, setCustomExtsState] = useState<string[]>([]);
  const [discoveredExts, setDiscoveredExtsState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [presets, customs, cached] = await Promise.all([getUserPresets(), getCustomExts(), getDiscoveredExts()]);
      if (!alive) return;
      setUserPresetsState(presets);
      setCustomExtsState(customs);
      if (cached) {
        setDiscoveredExtsState(cached.exts);
        setLoading(false);
      }

      const { apps } = await fetchAppMap();
      if (!alive) return;
      const fresh = await runDiscovery(apps);
      if (!alive) return;
      await setDiscoveredExts(fresh);
      const cachedSig = cached?.signature ?? appsSignature([]);
      if (!cached || fresh.signature !== cachedSig) {
        setDiscoveredExtsState(fresh.exts);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistUser = async (next: Preset[]) => {
    setUserPresetsState(next);
    await setUserPresets(next);
  };

  const newPreset = () => {
    push(
      <NewPresetExtensionsView
        customExts={customExts}
        discoveredExts={discoveredExts}
        onCustomExtsChange={async (next) => {
          setCustomExtsState(next);
          await setCustomExts(next);
        }}
        onSave={async (preset) => {
          await persistUser([...userPresets, preset]);
        }}
      />,
    );
  };

  const editPreset = (preset: Preset) => {
    push(
      <EditPresetView
        initial={preset}
        customExts={customExts}
        discoveredExts={discoveredExts}
        onCustomExtsChange={async (next) => {
          setCustomExtsState(next);
          await setCustomExts(next);
        }}
        onSave={async (updated) => {
          await persistUser(userPresets.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />,
    );
  };

  const renamePreset = (preset: Preset) => {
    push(
      <RenameForm
        current={preset.name}
        currentEmoji={preset.emoji}
        onRename={async (name, emoji) => {
          await persistUser(userPresets.map((p) => (p.id === preset.id ? { ...p, name, emoji } : p)));
        }}
      />,
    );
  };

  const duplicatePreset = async (preset: Preset) => {
    const copy: Preset = {
      id: randomUUID(),
      name: `${preset.name} copy`,
      exts: [...preset.exts],
    };
    await persistUser([...userPresets, copy]);
    await showToast({ title: `Duplicated to "${copy.name}"` });
  };

  const deletePreset = async (preset: Preset) => {
    const ok = await confirmAlert({
      title: `Delete preset "${preset.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await persistUser(userPresets.filter((p) => p.id !== preset.id));
  };

  return (
    <List
      isLoading={loading}
      navigationTitle="Manage Presets"
      searchBarPlaceholder="Search presets"
      actions={
        <ActionPanel>
          <Action
            title="New Preset"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={newPreset}
          />
        </ActionPanel>
      }
    >
      {userPresets.map((p) => (
        <PresetRow
          key={p.id}
          preset={p}
          onEdit={() => editPreset(p)}
          onRename={() => renamePreset(p)}
          onDuplicate={() => duplicatePreset(p)}
          onDelete={() => deletePreset(p)}
          onNew={newPreset}
        />
      ))}
    </List>
  );
}

function PresetRow({
  preset,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
  onNew,
}: {
  preset: Preset;
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onNew: () => void;
}) {
  return (
    <List.Item
      title={preset.name}
      subtitle={`${preset.exts.length} extensions`}
      icon={preset.emoji ?? Icon.Star}
      keywords={preset.exts}
      actions={
        <ActionPanel>
          <Action title="Edit Contents" icon={Icon.Pencil} onAction={onEdit} />
          <Action
            title="Duplicate"
            icon={Icon.Duplicate}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onDuplicate}
          />
          <Action
            title="Edit Name & Emoji"
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRename}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
            onAction={onDelete}
          />
          <ActionPanel.Section>
            <Action title="New Preset" icon={Icon.Plus} shortcut={{ modifiers: ["cmd"], key: "n" }} onAction={onNew} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EditPresetView({
  initial,
  customExts,
  discoveredExts,
  onCustomExtsChange,
  onSave,
}: {
  initial: Preset;
  customExts: string[];
  discoveredExts: string[];
  onCustomExtsChange: (next: string[]) => Promise<void>;
  onSave: (preset: Preset) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(initial.name);
  const [emoji, setEmoji] = useState<string | undefined>(initial.emoji);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.exts));
  const [customs, setCustoms] = useState<string[]>(customExts);
  const [searchText, setSearchText] = useState("");
  const [handlers, setHandlers] = useState<Map<string, HandlerInfo>>(new Map());

  useEffect(() => {
    let alive = true;
    (async () => {
      const { byBundleID } = await fetchAppMap();
      if (!alive) return;
      const exts = [...new Set([...discoveredExts, ...customExts, ...initial.exts])];
      const h = await fetchCurrentHandlers(exts, byBundleID);
      if (!alive) return;
      setHandlers(h);
    })();
    return () => {
      alive = false;
    };
  }, [discoveredExts, customExts, initial.exts]);

  const allExts = useMemo(
    () => [...new Set([...discoveredExts, ...customs, ...selected])].sort(),
    [discoveredExts, customs, selected],
  );
  const customSet = useMemo(() => new Set(customs), [customs]);

  const candidateExt = normalizeExt(searchText);
  const q = candidateExt;
  const candidateValid = candidateExt.length > 0 && /^[a-z0-9]+$/.test(candidateExt);
  const candidateExists = candidateValid && allExts.includes(candidateExt);
  const showAddCandidate = candidateValid && !candidateExists;
  const filteredExts = useMemo(() => {
    if (!q) return allExts;
    return allExts.filter((e) => e.toLowerCase().includes(q));
  }, [allExts, q]);

  const toggle = (ext: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      return next;
    });

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Name required" });
      return;
    }
    if (selected.size === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pick at least one extension",
      });
      return;
    }
    const preset: Preset = {
      id: initial.id,
      name: trimmed,
      emoji,
      exts: [...selected].sort(),
    };
    await onSave(preset);
    pop();
  };

  const addCustom = (ext: string) => {
    const next = [...new Set([...customs, ext])].sort();
    setCustoms(next);
    onCustomExtsChange(next);
    setSelected((prev) => new Set(prev).add(ext));
  };

  const addCustomInline = (ext: string) => {
    addCustom(ext);
    setSearchText("");
  };

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={`Edit preset — ${selected.size} selected`}
      searchBarPlaceholder="Search extensions"
      actions={
        <ActionPanel>
          <Action
            title="Save Preset"
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={save}
          />
          <Action.Push
            title="Set Name & Emoji…"
            icon={Icon.TextCursor}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            target={
              <RenameForm
                current={name}
                currentEmoji={emoji}
                onRename={async (n, e) => {
                  setName(n);
                  setEmoji(e);
                }}
              />
            }
          />
          <Action.Push
            title="Add Custom Extension…"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<InlineAddCustom existing={new Set(allExts)} onAdded={addCustom} />}
          />
        </ActionPanel>
      }
    >
      <List.Section title={name ? `${emoji ? `${emoji} ` : ""}Name: ${name}` : "(no name yet — ⌘R)"} />
      <List.Section title="Extensions">
        {filteredExts.map((ext) => {
          const isSelected = selected.has(ext);
          const isCustom = customSet.has(ext);
          const handler = handlers.get(ext);
          const accessories: List.Item.Accessory[] = [];
          if (isCustom) accessories.push({ tag: "custom" });
          if (handler?.app) {
            accessories.push({ text: handler.app.name, icon: { fileIcon: handler.app.path } });
          } else if (handler?.bundleID) {
            accessories.push({ text: handler.bundleID });
          }
          return (
            <List.Item
              key={ext}
              title={`.${ext}`}
              icon={isSelected ? Icon.CheckCircle : Icon.Circle}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(ext)}
                  />
                  <Action
                    title="Save Preset"
                    icon={Icon.SaveDocument}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={save}
                  />
                  <Action.Push
                    title="Set Name & Emoji…"
                    icon={Icon.TextCursor}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    target={
                      <RenameForm
                        current={name}
                        currentEmoji={emoji}
                        onRename={async (n, e) => {
                          setName(n);
                          setEmoji(e);
                        }}
                      />
                    }
                  />
                  <Action.Push
                    title="Add Custom Extension…"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<InlineAddCustom existing={new Set(allExts)} onAdded={addCustom} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {showAddCandidate && (
        <List.Section title="Add new">
          <List.Item
            title={`Add ".${candidateExt}"`}
            subtitle="Not in list — add as custom extension"
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action
                  title={`Add & Select ".${candidateExt}"`}
                  icon={Icon.Plus}
                  onAction={() => addCustomInline(candidateExt)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function NewPresetExtensionsView({
  customExts,
  discoveredExts,
  onCustomExtsChange,
  onSave,
}: {
  customExts: string[];
  discoveredExts: string[];
  onCustomExtsChange: (next: string[]) => Promise<void>;
  onSave: (preset: Preset) => Promise<void>;
}) {
  const { push, pop } = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customs, setCustoms] = useState<string[]>(customExts);
  const [searchText, setSearchText] = useState("");
  const [handlers, setHandlers] = useState<Map<string, HandlerInfo>>(new Map());

  useEffect(() => {
    let alive = true;
    (async () => {
      const { byBundleID } = await fetchAppMap();
      if (!alive) return;
      const exts = [...new Set([...discoveredExts, ...customExts])];
      const h = await fetchCurrentHandlers(exts, byBundleID);
      if (!alive) return;
      setHandlers(h);
    })();
    return () => {
      alive = false;
    };
  }, [discoveredExts, customExts]);

  const allExts = useMemo(
    () => [...new Set([...discoveredExts, ...customs, ...selected])].sort(),
    [discoveredExts, customs, selected],
  );
  const customSet = useMemo(() => new Set(customs), [customs]);

  const candidateExt = normalizeExt(searchText);
  const q = candidateExt;
  const candidateValid = candidateExt.length > 0 && /^[a-z0-9]+$/.test(candidateExt);
  const candidateExists = candidateValid && allExts.includes(candidateExt);
  const showAddCandidate = candidateValid && !candidateExists;
  const filteredExts = useMemo(() => {
    if (!q) return allExts;
    return allExts.filter((e) => e.toLowerCase().includes(q));
  }, [allExts, q]);

  const toggle = (ext: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      return next;
    });

  const addCustom = (ext: string) => {
    const next = [...new Set([...customs, ext])].sort();
    setCustoms(next);
    onCustomExtsChange(next);
    setSelected((prev) => new Set(prev).add(ext));
  };

  const addCustomInline = (ext: string) => {
    addCustom(ext);
    setSearchText("");
  };

  const continueToName = () => {
    if (selected.size === 0) return;
    push(
      <NamePresetForm
        exts={[...selected].sort()}
        onSaved={async (preset) => {
          await onSave(preset);
        }}
        onCompleted={() => pop()}
      />,
    );
  };

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={selected.size > 0 ? `New preset — ${selected.size} selected` : "New preset"}
      searchBarPlaceholder="Search extensions"
    >
      {selected.size > 0 && (
        <List.Section>
          <List.Item
            title="Continue → Name & Emoji"
            subtitle={`${selected.size} extension${selected.size === 1 ? "" : "s"} selected`}
            icon={Icon.ArrowRight}
            accessories={[{ tag: "⏎" }]}
            actions={
              <ActionPanel>
                <Action title="Continue → Name & Emoji" icon={Icon.ArrowRight} onAction={continueToName} />
                <Action
                  title="Clear Selection"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => setSelected(new Set())}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Extensions">
        {filteredExts.map((ext) => {
          const isSelected = selected.has(ext);
          const isCustom = customSet.has(ext);
          const handler = handlers.get(ext);
          const accessories: List.Item.Accessory[] = [];
          if (isCustom) accessories.push({ tag: "custom" });
          if (handler?.app) {
            accessories.push({ text: handler.app.name, icon: { fileIcon: handler.app.path } });
          } else if (handler?.bundleID) {
            accessories.push({ text: handler.bundleID });
          }
          return (
            <List.Item
              key={ext}
              title={`.${ext}`}
              icon={isSelected ? Icon.CheckCircle : Icon.Circle}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggle(ext)}
                  />
                  {selected.size > 0 && (
                    <Action
                      title="Continue → Name & Emoji"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={continueToName}
                    />
                  )}
                  <Action.Push
                    title="Add Custom Extension…"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={<InlineAddCustom existing={new Set(allExts)} onAdded={addCustom} />}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {showAddCandidate && (
        <List.Section title="Add new">
          <List.Item
            title={`Add ".${candidateExt}"`}
            subtitle="Not in list — add as custom extension"
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action
                  title={`Add & Select ".${candidateExt}"`}
                  icon={Icon.Plus}
                  onAction={() => addCustomInline(candidateExt)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function NamePresetForm({
  exts,
  onSaved,
  onCompleted,
}: {
  exts: string[];
  onSaved: (preset: Preset) => Promise<void>;
  onCompleted: () => void;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle="Name & emoji"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            icon={Icon.SaveDocument}
            onSubmit={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Name required");
                return;
              }
              const trimmedEmoji = emoji.trim();
              await onSaved({
                id: randomUUID(),
                name: trimmed,
                emoji: trimmedEmoji || undefined,
                exts,
              });
              pop();
              onCompleted();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset name"
        value={name}
        error={error}
        onChange={(v) => {
          setName(v);
          if (error) setError(undefined);
        }}
      />
      <Form.TextField id="emoji" title="Emoji" placeholder="optional, e.g. 💻" value={emoji} onChange={setEmoji} />
      <Form.Description title="Extensions" text={exts.map((e) => `.${e}`).join(" ")} />
    </Form>
  );
}

function RenameForm({
  current,
  currentEmoji,
  onRename,
}: {
  current: string;
  currentEmoji?: string;
  onRename: (name: string, emoji: string | undefined) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(current);
  const [emoji, setEmoji] = useState(currentEmoji ?? "");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Name required");
                return;
              }
              const trimmedEmoji = emoji.trim();
              await onRename(trimmed, trimmedEmoji || undefined);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset name"
        value={name}
        error={error}
        onChange={(v) => {
          setName(v);
          if (error) setError(undefined);
        }}
      />
      <Form.TextField id="emoji" title="Emoji" placeholder="optional, e.g. 💻" value={emoji} onChange={setEmoji} />
    </Form>
  );
}

function InlineAddCustom({ existing, onAdded }: { existing: Set<string>; onAdded: (ext: string) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Extension"
            onSubmit={async () => {
              const ext = normalizeExt(value);
              if (!ext) {
                setError("Extension required");
                return;
              }
              if (!/^[a-z0-9]+$/i.test(ext)) {
                setError("Letters and digits only");
                return;
              }
              if (existing.has(ext)) {
                setError("Already in the list");
                return;
              }
              onAdded(ext);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ext"
        title="File extension"
        placeholder="e.g. mdx"
        value={value}
        error={error}
        onChange={(v) => {
          setValue(v);
          if (error) setError(undefined);
        }}
      />
    </Form>
  );
}
