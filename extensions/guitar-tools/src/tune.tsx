import { Action, ActionPanel, Detail, environment, Icon, List, LocalStorage, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { Capture } from "./audio";
import { frequencyToNote, type Reading } from "./detector";
import { listInputs, type Device } from "./devices";
import { tunerMarkdown, type DisplayState } from "./tuner-display";

const STORAGE_KEY = "selectedAudioDevice";
const EMPTY: Reading = { db: -100, peak: 0, pitch: null, clarity: 0 };

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [device, setDevice] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading>(EMPTY);
  const [warming, setWarming] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [restart, setRestart] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([listInputs(), LocalStorage.getItem<string>(STORAGE_KEY)])
      .then(([inputs, saved]) => {
        if (cancelled) return;
        setDevices(inputs);
        // Preserve the existing saved input; new users follow the system default.
        const selected = saved || "";
        setDevice(selected);
        if (selected && !inputs.some((d) => d.name === selected)) {
          setError(`The input "${selected}" is disconnected. Select another input.`);
          setPicking(true);
        } else setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (device === undefined || picking || paused || loading) return;
    let cancelled = false;
    let lastUI = 0;
    let firstFrame = 0;
    let lastValid = 0;
    let stablePitch: number | null = null;
    let recent: number[] = [];
    let recentMidi: number | undefined;
    setReading(EMPTY);
    setError(null);
    setWarming(true);
    const capture = new Capture({
      device,
      onError: (message) => {
        if (!cancelled) setError(message);
      },
      onReading: (raw) => {
        if (cancelled) return;
        const now = Date.now();
        firstFrame ||= now;
        const warm = now - firstFrame < 1200;
        if (raw.pitch && !warm) {
          const midi = frequencyToNote(raw.pitch).midi;
          if (recentMidi !== midi) {
            recent = [];
            recentMidi = midi;
          }
          recent.push(raw.pitch);
          recent = recent.slice(-3);
          if (recent.length >= 2) {
            stablePitch = [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)];
            lastValid = now;
          }
        } else {
          recent = [];
          recentMidi = undefined;
        }
        if (now - lastValid > 600) stablePitch = null;
        if (now - lastUI >= 100) {
          lastUI = now;
          setWarming(warm);
          setReading({ ...raw, pitch: warm ? null : stablePitch });
        }
      },
    });
    void capture.start();
    return () => {
      cancelled = true;
      void capture.stop();
    };
  }, [device, picking, paused, loading, restart]);

  async function choose(name: string) {
    try {
      await LocalStorage.setItem(STORAGE_KEY, name);
      setDevice(name);
      setError(null);
      setPaused(false);
      setPicking(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const pickerActions = (name: string) => (
    <ActionPanel>
      <Action title="Select This Device" icon={Icon.Checkmark} onAction={() => choose(name)} />
      {name && <Action.CopyToClipboard title="Copy Device Name" content={name} />}
      <Action title="Refresh Audio Inputs" icon={Icon.ArrowClockwise} onAction={() => setRefresh((n) => n + 1)} />
      <Action title="Back to Tuner" icon={Icon.ArrowLeft} onAction={() => setPicking(false)} />
    </ActionPanel>
  );

  if (picking) {
    return (
      <List isLoading={loading} searchBarPlaceholder="Select audio input…">
        <List.Section title={error || "Audio input used only by this tuner"}>
          {devices.map((d) => (
            <List.Item
              key={d.name}
              title={d.name}
              subtitle={`${d.manufacturer} · ${d.channels} channel(s)`}
              icon={Icon.Microphone}
              accessories={d.name === device ? [{ icon: Icon.Checkmark, tooltip: "Selected Input" }] : []}
              actions={pickerActions(d.name)}
            />
          ))}
          <List.Item
            title="System Default Input"
            subtitle="Follows macOS audio settings"
            icon={Icon.Desktop}
            accessories={device === "" ? [{ icon: Icon.Checkmark }] : []}
            actions={pickerActions("")}
          />
        </List.Section>
      </List>
    );
  }

  const state: DisplayState = error
    ? "error"
    : paused
      ? "paused"
      : loading
        ? "loading"
        : warming
          ? "warming"
          : "listening";
  const markdown = tunerMarkdown({
    ...reading,
    device: device || "",
    state,
    dark: environment.appearance === "dark",
  });
  return (
    <Detail
      isLoading={loading}
      navigationTitle="Chromatic Tuner"
      markdown={error ? `## Audio Capture Failed\n\n${error.slice(0, 600)}` : markdown}
      actions={
        <ActionPanel>
          <Action title="Select Audio Input Device" icon={Icon.Microphone} onAction={() => setPicking(true)} />
          <Action
            title={paused ? "Resume Listening" : "Pause Listening"}
            icon={paused ? Icon.Play : Icon.Pause}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => setPaused((v) => !v)}
          />
          <Action
            title="Restart Capture"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              setPaused(false);
              setRefresh((n) => n + 1);
              setRestart((n) => n + 1);
            }}
          />
        </ActionPanel>
      }
    />
  );
}
