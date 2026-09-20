import { Action, ActionPanel, Clipboard, Icon, launchCommand, LaunchType, List, open, Keyboard } from "@raycast/api";
import { existsSync } from "node:fs";
import { useEffect, useState } from "react";
import { compact, showFailure } from "./lib/errors";
import { isHandyRunning } from "./lib/handy";
import { getHistory, HistoryEntry, preferredText } from "./lib/history";
import { MODELS, getDownloadedModels } from "./lib/models";
import { HANDY_APP_PATH, SETTINGS_PATH } from "./lib/paths";
import { readSettings } from "./lib/settings";
import { relativeDate } from "./lib/time";

interface DashboardState {
  running: boolean;
  model: string;
  language: string;
  dictionaryCount: number;
  entries: HistoryEntry[];
}

function commandAction(title: string, commandName: string, icon: Icon) {
  return (
    <Action
      title={title}
      icon={icon}
      onAction={() => launchCommand({ name: commandName, type: LaunchType.UserInitiated })}
    />
  );
}

export default function Command() {
  const [state, setState] = useState<DashboardState>();
  async function load() {
    try {
      const running = isHandyRunning();
      const settings = readSettings();
      const entries = getHistory(5);
      const downloaded = getDownloadedModels();
      const model =
        downloaded.find((item) => item.id === settings.selected_model)?.name ??
        MODELS.find((item) => item.id === settings.selected_model)?.name ??
        settings.selected_model ??
        "Not selected";
      setState({
        running,
        model,
        language:
          settings.selected_language === "auto" || !settings.selected_language
            ? "Automatic"
            : settings.selected_language,
        dictionaryCount: settings.custom_words?.length ?? 0,
        entries,
      });
    } catch (error) {
      await showFailure("Could not load Handy dashboard", error);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (!existsSync(SETTINGS_PATH) && state === undefined)
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="Set Up Handy First"
          description="Install and open Handy once, then return to this dashboard."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download Handy" url="https://handy.computer" />
            </ActionPanel>
          }
        />
      </List>
    );
  return (
    <List isLoading={!state} searchBarPlaceholder="Handy commands and recent transcripts…">
      {state && (
        <>
          <List.Section title="Status" subtitle={state.running ? "Handy is running" : "Handy is not running"}>
            <List.Item
              icon={{
                source: state.running ? Icon.CheckCircle : Icon.Circle,
                tintColor: state.running ? "#34C759" : "#8E8E93",
              }}
              title={state.running ? "Handy is Ready" : "Launch Handy"}
              subtitle={`${state.model} · ${state.language}`}
              accessories={[{ text: `${state.dictionaryCount} dictionary terms` }]}
              actions={
                <ActionPanel>
                  {state.running ? (
                    commandAction("Toggle Recording", "toggle-recording", Icon.Microphone)
                  ) : (
                    <Action title="Open Handy" icon={Icon.AppWindow} onAction={() => open(HANDY_APP_PATH)} />
                  )}
                  {commandAction("Record with Post-Processing", "record-with-post-processing", Icon.Stars)}
                  {commandAction("Select Model", "select-model", Icon.Gear)}
                  <Action
                    title="Refresh Dashboard"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={load}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Library">
            <List.Item
              icon={Icon.MagnifyingGlass}
              title="Search All Transcripts"
              subtitle="Browse, copy, rename, save, and delete"
              actions={
                <ActionPanel>
                  {commandAction("Open Transcript Search", "search-transcripts", Icon.MagnifyingGlass)}
                </ActionPanel>
              }
            />
            <List.Item
              icon={Icon.Book}
              title="Manage Dictionary"
              subtitle={`${state.dictionaryCount} custom ${state.dictionaryCount === 1 ? "term" : "terms"}`}
              actions={<ActionPanel>{commandAction("Manage Dictionary", "manage-dictionary", Icon.Book)}</ActionPanel>}
            />
            <List.Item
              icon={Icon.Waveform}
              title="Browse Recordings"
              subtitle="Play and reveal saved audio"
              actions={
                <ActionPanel>{commandAction("Search Recordings", "search-recordings", Icon.Waveform)}</ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Recent Transcripts" subtitle={`${state.entries.length} most recent`}>
            {state.entries.map((entry) => {
              const text = preferredText(entry);
              return (
                <List.Item
                  key={entry.id}
                  icon={entry.saved ? Icon.Star : Icon.Text}
                  title={entry.title || compact(text)}
                  subtitle={compact(text, 90)}
                  accessories={[{ text: relativeDate(entry.timestamp) }]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Transcript" content={text} />
                      <Action title="Paste Transcript" icon={Icon.TextCursor} onAction={() => Clipboard.paste(text)} />
                      {commandAction("Open Recent Transcripts", "recent-transcripts", Icon.Clock)}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
