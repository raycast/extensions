import React, { useMemo } from "react";
import { Action, ActionPanel, Keyboard } from "@raycast/api";

interface GameActionsProps {
  onMainAction: () => void;
  onToggleHelp: () => void;
  onToggleSelection: (n: number) => void;
  onResetGame: () => void;
}

// Pre-defined action configurations for better performance
const TILE_ACTIONS = Array.from({ length: 10 }, (_, i) => ({
  title: `Select ${i === 9 ? 0 : i + 1}`,
  key: i === 9 ? "0" : String(i + 1),
  value: i === 9 ? 10 : i + 1,
}));

export const GameActions = React.memo<GameActionsProps>(
  ({ onMainAction, onToggleHelp, onToggleSelection, onResetGame }) => {
    const actions = useMemo(
      () => (
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Main Action" onAction={onMainAction} />
          </ActionPanel.Section>
          <Action title="Toggle Help" onAction={onToggleHelp} shortcut={{ key: "h", modifiers: ["shift"] }} />
          {TILE_ACTIONS.map(({ title, key, value }) => (
            <Action
              key={key}
              title={title}
              onAction={() => onToggleSelection(value)}
              shortcut={{ key: key as Keyboard.KeyEquivalent, modifiers: ["shift"] }}
            />
          ))}
          <Action title="Reset Game" onAction={onResetGame} shortcut={{ key: "r", modifiers: ["shift"] }} />
        </ActionPanel>
      ),
      [onMainAction, onToggleHelp, onToggleSelection, onResetGame],
    );

    return actions;
  },
);

GameActions.displayName = "GameActions";
