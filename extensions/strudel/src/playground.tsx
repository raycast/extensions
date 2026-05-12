import {
  ActionPanel,
  Action,
  List,
  Form,
  showToast,
  Toast,
  Icon,
  confirmAlert,
  getPreferenceValues,
  useNavigation,
  Clipboard,
  openCommandPreferences,
  open,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { code2hash } from "@strudel/core";
import {
  renderAndPlay,
  renderAndExport,
  pauseLive,
  resumeLive,
  stopLive,
  stopTrack,
  getLiveState,
  getActiveIds,
} from "./lib/strudel";
import { listPatterns, savePattern, deletePattern, updatePattern, setLastPlayed, SavedPattern } from "./lib/storage";

interface Preferences {
  defaultCpm: string;
  defaultCycles: string;
  loopPatterns: boolean;
}

function EditPatternForm({ pattern, onSaved }: { pattern: SavedPattern; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState(pattern.name);
  const [code, setCode] = useState(pattern.code);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              const trimmedName = name.trim();
              const trimmedCode = code.trim();
              if (!trimmedName) {
                await showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              if (!trimmedCode) {
                await showToast({ style: Toast.Style.Failure, title: "Code required" });
                return;
              }
              await updatePattern(pattern.id, { name: trimmedName, code: trimmedCode });
              await showToast({ style: Toast.Style.Success, title: "Pattern updated", message: trimmedName });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextArea id="code" title="Code" value={code} onChange={setCode} />
    </Form>
  );
}

function SaveFromClipboard({ onSaved }: { onSaved: () => void }) {
  const { pop } = useNavigation();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text?.trim()) {
        setCode(text.trim());
      } else {
        showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" }).then(pop);
      }
    });
  }, []);
  if (!code) return <Form isLoading />;
  return <SaveFromClipboardForm code={code} onSaved={onSaved} />;
}

function SaveFromClipboardForm({ code, onSaved }: { code: string; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              const trimmed = name.trim();
              if (!trimmed) {
                await showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await savePattern(trimmed, code);
              await showToast({ style: Toast.Style.Success, title: "Pattern saved", message: trimmed });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder="my-beat" />
      <Form.Description title="Code" text={code} />
    </Form>
  );
}

const CPM_OPTIONS = ["30", "45", "60", "90", "120", "150", "180"];

export default function Playground() {
  const prefs = getPreferenceValues<Preferences>();
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
  const [playState, setPlayState] = useState<"playing" | "paused" | "stopped">("stopped");
  const [cpm, setCpm] = useState(prefs.defaultCpm ?? "60");

  const refresh = async () => {
    const items = await listPatterns();
    setPatterns(items);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    return () => {
      stopLive().catch(() => {});
    };
  }, []);

  const syncState = () => {
    setActiveIds(new Set(getActiveIds()));
    setPlayState(getLiveState());
  };

  const cpsFromCpm = () => (Number(cpm) || 60) / 60;

  const playPattern = async (p: SavedPattern) => {
    try {
      await showToast({ style: Toast.Style.Animated, title: `Rendering ${p.name}...` });
      await renderAndPlay(
        p.code,
        { cps: cpsFromCpm(), cycles: Number(prefs.defaultCycles) || 2 },
        p.id,
        prefs.loopPatterns,
      );
      await setLastPlayed(p.id);
      syncState();
      await showToast({ style: Toast.Style.Success, title: `Playing ${p.name}`, message: `${cpm} cpm` });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Render failed", message: String(e) });
    }
  };

  const togglePattern = async (p: SavedPattern) => {
    if (activeIds.has(p.id)) {
      stopTrack(p.id);
      syncState();
      return;
    }
    await playPattern(p);
  };

  const togglePlayAll = async () => {
    if (activeIds.size > 0) {
      await stopLive();
      syncState();
      return;
    }
    for (const p of patterns) {
      try {
        await renderAndPlay(
          p.code,
          { cps: cpsFromCpm(), cycles: Number(prefs.defaultCycles) || 2 },
          p.id,
          prefs.loopPatterns,
        );
      } catch (e) {
        console.error(`render ${p.name} failed`, e);
      }
    }
    syncState();
  };

  const togglePause = async () => {
    if (playState === "playing") await pauseLive();
    else if (playState === "paused") await resumeLive();
    syncState();
  };

  const handleStopAll = async () => {
    await stopLive();
    syncState();
  };

  const handleDelete = async (p: SavedPattern) => {
    if (await confirmAlert({ title: `Delete "${p.name}"?` })) {
      if (activeIds.has(p.id)) {
        stopTrack(p.id);
        syncState();
      }
      await deletePattern(p.id);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
      refresh();
    }
  };

  // Re-render active tracks when CPM changes mid-play.
  const skipFirstCpmEffect = useRef(true);
  useEffect(() => {
    if (skipFirstCpmEffect.current) {
      skipFirstCpmEffect.current = false;
      return;
    }
    if (activeIds.size === 0) return;
    let cancelled = false;
    (async () => {
      const cps = cpsFromCpm();
      for (const id of Array.from(activeIds)) {
        if (cancelled) break;
        const p = patterns.find((x) => x.id === id);
        if (!p) continue;
        try {
          await renderAndPlay(p.code, { cps, cycles: Number(prefs.defaultCycles) || 2 }, p.id);
        } catch (e) {
          console.error(`re-render ${p.name} failed`, e);
        }
      }
      if (!cancelled) syncState();
    })();
    return () => {
      cancelled = true;
    };
  }, [cpm]);

  const cpmDropdown = (
    <List.Dropdown tooltip="Cycles per minute" value={cpm} onChange={setCpm}>
      {CPM_OPTIONS.map((v) => (
        <List.Dropdown.Item key={v} value={v} title={`${v} cpm`} />
      ))}
    </List.Dropdown>
  );

  const anyActive = activeIds.size > 0;

  const globalControls = anyActive && (
    <>
      <Action
        title={playState === "playing" ? "Pause All" : "Resume All"}
        icon={playState === "playing" ? Icon.Pause : Icon.Play}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={togglePause}
      />
      <Action title="Stop All" icon={Icon.Stop} shortcut={{ modifiers: ["cmd"], key: "." }} onAction={handleStopAll} />
    </>
  );

  return (
    <List isLoading={loading} searchBarPlaceholder="Search patterns..." searchBarAccessory={cpmDropdown}>
      {patterns.length > 0 && (
        <List.Section title="Mix">
          <List.Item
            icon={anyActive ? Icon.Stop : Icon.PlayFilled}
            title={anyActive ? "Stop All" : "Play All Together"}
            subtitle={anyActive ? `${activeIds.size}/${patterns.length} playing` : `${patterns.length} patterns`}
            actions={
              <ActionPanel>
                <Action
                  title={anyActive ? "Stop All" : "Play All"}
                  icon={anyActive ? Icon.Stop : Icon.Play}
                  onAction={togglePlayAll}
                />
                {globalControls}
                <Action.OpenInBrowser
                  title="Open All in REPL"
                  url={`https://strudel.cc/#${code2hash(patterns.map((p) => p.code).join("\n"))}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
                <Action.Push
                  title="Save from Clipboard"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  target={<SaveFromClipboard onSaved={refresh} />}
                />
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Saved Patterns">
        {patterns.map((p) => {
          const isActive = activeIds.has(p.id);
          return (
            <List.Item
              key={p.id}
              icon={isActive ? Icon.SpeakerOn : Icon.Music}
              title={p.name}
              subtitle={p.code}
              accessories={
                isActive ? [{ tag: { value: playState === "paused" ? "paused" : "on", color: "#22c55e" } }] : undefined
              }
              actions={
                <ActionPanel>
                  <Action
                    title={isActive ? "Stop This" : "Play This"}
                    icon={isActive ? Icon.Stop : Icon.Play}
                    onAction={() => togglePattern(p)}
                  />
                  {globalControls}
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditPatternForm pattern={p} onSaved={refresh} />}
                  />
                  <Action.CopyToClipboard title="Copy Code" content={p.code} />
                  <Action.OpenInBrowser
                    title="Open in REPL"
                    url={`https://strudel.cc/#${code2hash(p.code)}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                  <Action
                    title="Export WAV"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={async () => {
                      try {
                        await showToast({ style: Toast.Style.Animated, title: `Rendering ${p.name}...` });
                        const slug = p.name
                          .replace(/[^a-z0-9]/gi, "-")
                          .toLowerCase()
                          .replace(/-+/g, "-");
                        const filename = `${slug}-${Date.now()}`;
                        const outPath = await renderAndExport(
                          p.code,
                          { cps: cpsFromCpm(), cycles: Number(prefs.defaultCycles) || 2 },
                          filename,
                        );
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Exported",
                          message: `${filename}.wav`,
                          primaryAction: { title: "Show in Finder", onAction: () => open(outPath) },
                        });
                      } catch (e) {
                        await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(e) });
                      }
                    }}
                  />
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(p)}
                  />
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
        {!loading && patterns.length === 0 && (
          <List.Item icon={Icon.Info} title="No saved patterns yet" subtitle="Save one from the Evaluate command" />
        )}
      </List.Section>
    </List>
  );
}
