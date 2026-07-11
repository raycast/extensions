import { List, ActionPanel, Action, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import { PromptMode, getActiveMode, setActiveMode } from "./history-storage";

const MODES: { mode: PromptMode; label: string; shortcut: string }[] = [
  { mode: "general", label: "General", shortcut: "1" },
  { mode: "email", label: "Email", shortcut: "2" },
  { mode: "slack", label: "Slack / Chat", shortcut: "3" },
  { mode: "notes", label: "Notes", shortcut: "4" },
  { mode: "custom", label: "Custom", shortcut: "5" },
];

export default function SelectMode() {
  const [activeMode, setActiveModeState] = useState<PromptMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getActiveMode()
      .then((mode) => {
        setActiveModeState(mode || "general");
        setIsLoading(false);
      })
      .catch(() => {
        setActiveModeState("general");
        setIsLoading(false);
      });
  }, []);

  async function handleSelect(mode: PromptMode, label: string) {
    await setActiveMode(mode);
    setActiveModeState(mode);
    await showToast({ style: Toast.Style.Success, title: `Mode: ${label}` });
    await popToRoot();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select mode...">
      {MODES.map(({ mode, label, shortcut }) => (
        <List.Item
          key={mode}
          title={label}
          icon={mode === activeMode ? Icon.CheckCircle : Icon.Circle}
          accessories={[{ text: `Ctrl+${shortcut}` }]}
          actions={
            <ActionPanel>
              <Action title={`Select ${label} Mode`} onAction={() => handleSelect(mode, label)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
