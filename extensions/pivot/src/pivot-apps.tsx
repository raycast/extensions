import {
  Action,
  ActionPanel,
  Alert,
  Application,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { setDefaultHandlersBatch } from "swift:../swift";
import { Preset, normalizeExt } from "./lib/extensions";
import { HandlerInfo, fetchAppMap, fetchCurrentHandlers } from "./lib/handlers";
import { appsSignature, runDiscovery } from "./lib/discovery";
import {
  LastOp,
  getCustomExts,
  getDiscoveredExts,
  getLastApp,
  getUserPresets,
  setCustomExts,
  setDiscoveredExts,
  setLastApp,
  setLastOp,
  setUserPresets,
} from "./lib/storage";

type PivotResult = { ext: string; ok: boolean; error: string | null };

export default function PivotApps() {
  return <ExtensionPicker />;
}

function ExtensionPicker() {
  const { push } = useNavigation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [userPresets, setUserPresetsState] = useState<Preset[]>([]);
  const [customExts, setCustomExtsState] = useState<string[]>([]);
  const [discoveredExts, setDiscoveredExtsState] = useState<string[]>([]);
  const [handlers, setHandlers] = useState<Map<string, HandlerInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [presets, customs, cached, { apps, byBundleID: map }] = await Promise.all([
        getUserPresets(),
        getCustomExts(),
        getDiscoveredExts(),
        fetchAppMap(),
      ]);
      if (!alive) return;
      setUserPresetsState(presets);
      setCustomExtsState(customs);

      if (cached) {
        setDiscoveredExtsState(cached.exts);
        const initialAll = uniqueSorted([...cached.exts, ...customs]);
        const h = await fetchCurrentHandlers(initialAll, map);
        if (!alive) return;
        setHandlers(h);
        setLoading(false);
      }

      const fresh = await runDiscovery(apps);
      if (!alive) return;
      await setDiscoveredExts(fresh);
      const cachedSig = cached?.signature ?? appsSignature([]);
      if (cached && fresh.signature === cachedSig) {
        setLoading(false);
        return;
      }
      setDiscoveredExtsState(fresh.exts);
      const newAll = uniqueSorted([...fresh.exts, ...customs]);
      const h = await fetchCurrentHandlers(newAll, map);
      if (!alive) return;
      setHandlers(h);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allExts = useMemo(() => uniqueSorted([...discoveredExts, ...customExts]), [discoveredExts, customExts]);
  const allExtsSet = useMemo(() => new Set(allExts), [allExts]);
  const customSet = useMemo(() => new Set(customExts), [customExts]);

  const candidateExt = normalizeExt(searchText);
  const q = candidateExt;
  const candidateValid = candidateExt.length > 0 && /^[a-z0-9]+$/.test(candidateExt);
  const candidateExists = candidateValid && allExts.includes(candidateExt);
  const showAddCandidate = candidateValid && !candidateExists;

  const filteredPresets = useMemo(() => {
    if (!q) return userPresets;
    return userPresets.filter(
      (p) => p.name.toLowerCase().includes(q) || p.exts.some((e) => e.toLowerCase().includes(q)),
    );
  }, [userPresets, q]);

  const filteredExts = useMemo(() => {
    if (!q) return allExts;
    return allExts.filter((e) => e.toLowerCase().includes(q));
  }, [allExts, q]);

  const sortedSelected = useMemo(() => [...selected].sort(), [selected]);

  const hintTable = `\n\n| **⌘↩** &nbsp; Pick the target app |\n|:---:|\n`;

  const buildMarkdown = (focusExt?: string) => {
    if (selected.size === 0) return undefined;
    const tags = sortedSelected.map((e) => `\`.${e}\``).join("  ");
    let md = "";
    if (focusExt) {
      const handler = handlers.get(focusExt);
      const handlerText = handler?.app?.name ?? handler?.bundleID ?? "—";
      md += `**\`.${focusExt}\`** &nbsp; ⟶ &nbsp; ${handlerText}\n\n---\n\n`;
    }
    md += `**Selected (${sortedSelected.length})**\n\n${tags}\n${hintTable}`;
    return md;
  };

  const selectedDetail = selected.size === 0 ? undefined : <List.Item.Detail markdown={buildMarkdown()} />;

  const buildExtDetail = (ext: string) => {
    if (selected.size === 0) return undefined;
    return <List.Item.Detail markdown={buildMarkdown(ext)} />;
  };

  const toggleExt = (ext: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      return next;
    });
  };

  const replaceWithPreset = (preset: Preset) => {
    setSelected(new Set(preset.exts.filter((e) => allExtsSet.has(e))));
  };

  const unionPreset = (preset: Preset) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of preset.exts) {
        if (allExtsSet.has(e)) next.add(e);
      }
      return next;
    });
  };

  const saveAsPreset = async () => {
    if (selected.size === 0) return;
    push(
      <SavePresetForm
        exts={[...selected].sort()}
        onSaved={async (preset) => {
          const next = [...userPresets, preset];
          await setUserPresets(next);
          setUserPresetsState(next);
          await showToast({ title: `Saved preset "${preset.name}"` });
        }}
      />,
    );
  };

  const deletePreset = async (preset: Preset) => {
    const ok = await confirmAlert({
      title: `Delete preset "${preset.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const next = userPresets.filter((p) => p.id !== preset.id);
    await setUserPresets(next);
    setUserPresetsState(next);
  };

  const addCustomExt = async () => {
    push(
      <AddCustomExtForm
        existing={new Set(allExts)}
        onAdded={async (ext) => {
          const next = uniqueSorted([...customExts, ext]);
          await setCustomExts(next);
          setCustomExtsState(next);
          setSelected((prev) => new Set(prev).add(ext));
        }}
      />,
    );
  };

  const addCustomExtInline = async (ext: string) => {
    const next = uniqueSorted([...customExts, ext]);
    await setCustomExts(next);
    setCustomExtsState(next);
    setSelected((prev) => new Set(prev).add(ext));
    setSearchText("");
  };

  const removeCustomExt = async (ext: string) => {
    const ok = await confirmAlert({
      title: `Remove custom extension ".${ext}"?`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const next = customExts.filter((e) => e !== ext);
    await setCustomExts(next);
    setCustomExtsState(next);
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(ext);
      return n;
    });
  };

  const goToAppPicker = () => {
    if (selected.size === 0) return;
    push(<AppPicker exts={[...selected].sort()} handlers={handlers} />);
  };

  return (
    <List
      isLoading={loading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={selected.size > 0}
      navigationTitle={selected.size > 0 ? `Pivot — ${selected.size} selected` : "Pivot"}
      searchBarPlaceholder="Search presets and extensions"
    >
      <List.Section title="Presets">
        {filteredPresets.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.name}
            subtitle={`${preset.exts.length} extensions`}
            icon={preset.emoji ?? Icon.Star}
            keywords={preset.exts}
            detail={selectedDetail}
            actions={
              <ActionPanel>
                <Action
                  title="Replace Selection with Preset"
                  icon={Icon.CheckCircle}
                  onAction={() => replaceWithPreset(preset)}
                />
                <Action
                  title="Add Preset to Selection"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["opt"], key: "return" }}
                  onAction={() => unionPreset(preset)}
                />
                {selected.size > 0 && (
                  <Action
                    title="Pick App"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={goToAppPicker}
                  />
                )}
                <ActionPanel.Section>
                  {selected.size > 0 && (
                    <Action
                      title="Save Selection as Preset…"
                      icon={Icon.SaveDocument}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={saveAsPreset}
                    />
                  )}
                  <Action
                    title="Delete Preset"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={() => deletePreset(preset)}
                  />
                  <Action
                    title="Add Custom Extension…"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={addCustomExt}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Extensions">
        {filteredExts.map((ext) => {
          const isSelected = selected.has(ext);
          const isCustom = customSet.has(ext);
          const handler = handlers.get(ext);
          const accessories: List.Item.Accessory[] = [];
          if (isCustom) accessories.push({ tag: "custom" });
          if (handler?.app) {
            accessories.push({
              text: handler.app.name,
              icon: { fileIcon: handler.app.path },
            });
          } else if (handler?.bundleID) {
            accessories.push({ text: handler.bundleID });
          }
          return (
            <List.Item
              key={ext}
              title={`.${ext}`}
              icon={isSelected ? Icon.CheckCircle : Icon.Circle}
              accessories={accessories}
              detail={buildExtDetail(ext)}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => toggleExt(ext)}
                  />
                  {selected.size > 0 && (
                    <Action
                      title="Pick App"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={goToAppPicker}
                    />
                  )}
                  <ActionPanel.Section>
                    {selected.size > 0 && (
                      <Action
                        title="Save Selection as Preset…"
                        icon={Icon.SaveDocument}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={saveAsPreset}
                      />
                    )}
                    <Action
                      title="Add Custom Extension…"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={addCustomExt}
                    />
                    {isCustom && (
                      <Action
                        title="Remove Custom Extension"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={() => removeCustomExt(ext)}
                      />
                    )}
                  </ActionPanel.Section>
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
            detail={selectedDetail}
            actions={
              <ActionPanel>
                <Action
                  title={`Add & Select ".${candidateExt}"`}
                  icon={Icon.Plus}
                  onAction={() => addCustomExtInline(candidateExt)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function AppPicker({ exts, handlers }: { exts: string[]; handlers: Map<string, HandlerInfo> }) {
  const { pop } = useNavigation();
  const [apps, setApps] = useState<Application[]>([]);
  const [lastApp, setLastAppState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ apps: a }, last] = await Promise.all([fetchAppMap(), getLastApp()]);
      if (!alive) return;
      setApps(a.filter((x) => !!x.bundleId));
      setLastAppState(last);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sortedApps = useMemo(() => {
    const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
    if (!lastApp) return sorted;
    const idx = sorted.findIndex((a) => a.bundleId?.toLowerCase() === lastApp.toLowerCase());
    if (idx <= 0) return sorted;
    return [sorted[idx], ...sorted.slice(0, idx), ...sorted.slice(idx + 1)];
  }, [apps, lastApp]);

  const apply = async (app: Application) => {
    if (!app.bundleId) return;
    const ok = await confirmAlert({
      title: `Pivot ${exts.length} extension${exts.length === 1 ? "" : "s"} to ${app.name}?`,
      message: exts.map((e) => `.${e}`).join(" "),
      primaryAction: { title: "Pivot", style: Alert.ActionStyle.Default },
    });
    if (!ok) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Pivoting ${exts.length} extensions…`,
    });

    const previousHandlers: Record<string, string | null> = {};
    for (const ext of exts) {
      previousHandlers[ext] = handlers.get(ext)?.bundleID ?? null;
    }

    const pairs = exts.map((ext) => ({ ext, bundleID: app.bundleId! }));
    const results = (await setDefaultHandlersBatch(pairs)) as PivotResult[];
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    if (successes.length > 0) {
      const lastOp: LastOp = {
        targetBundleID: app.bundleId,
        targetName: app.name,
        previousHandlers: Object.fromEntries(successes.map((r) => [r.ext, previousHandlers[r.ext] ?? null])),
        timestamp: Date.now(),
      };
      await setLastOp(lastOp);
      await setLastApp(app.bundleId);
    }

    toast.style = failures.length === 0 ? Toast.Style.Success : Toast.Style.Failure;
    toast.title =
      failures.length === 0
        ? `Pivoted ${successes.length} to ${app.name}`
        : `Pivoted ${successes.length} / ${results.length} to ${app.name}`;

    if (failures.length > 0) {
      toast.primaryAction = {
        title: "View Failures",
        onAction: () => {
          showFailures(failures);
        },
      };
    }
    pop();
  };

  return (
    <List
      isLoading={loading}
      navigationTitle={`Pick app for ${exts.length} extension${exts.length === 1 ? "" : "s"}`}
      searchBarPlaceholder="Search apps"
    >
      {loading ? (
        <List.EmptyView icon={Icon.Hourglass} title="Loading apps…" description="Scanning installed applications" />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No apps found" />
      )}
      {sortedApps.map((app) => (
        <List.Item
          key={app.bundleId ?? app.path}
          title={app.name}
          subtitle={app.bundleId ?? ""}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action title={`Pivot to ${app.name}`} icon={Icon.ArrowRight} onAction={() => apply(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function showFailures(failures: PivotResult[]) {
  const lines = failures.map((f) => `- \`.${f.ext}\` — ${f.error ?? "unknown error"}`).join("\n");
  showToast({
    style: Toast.Style.Failure,
    title: `${failures.length} failed`,
    message: lines,
  });
}

function SavePresetForm({ exts, onSaved }: { exts: string[]; onSaved: (preset: Preset) => Promise<void> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            onSubmit={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Name required");
                return;
              }
              const trimmedEmoji = emoji.trim();
              await onSaved({
                id: crypto.randomUUID(),
                name: trimmed,
                emoji: trimmedEmoji || undefined,
                exts,
              });
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
      <Form.Description title="Extensions" text={exts.map((e) => `.${e}`).join(" ")} />
    </Form>
  );
}

function AddCustomExtForm({ existing, onAdded }: { existing: Set<string>; onAdded: (ext: string) => Promise<void> }) {
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
              await onAdded(ext);
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

function uniqueSorted(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}
