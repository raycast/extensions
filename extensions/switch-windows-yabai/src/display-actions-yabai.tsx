/**
 * Raycast Yabai Extension
 *
 * This extension provides a set of actions for managing windows using yabai window manager.
 *
 * Main Features:
 * 1. List and search all windows and applications
 * 2. Switch to a specific window
 * 3. Aggregate windows of the same application to a space
 * 4. Close windows and empty spaces
 * 5. Disperse windows across spaces on a display
 * 6. Move a specific window to another display
 *
 * The extension uses yabai commands to manage windows and spaces. It provides a user-friendly
 * interface for interacting with yabai through Raycast.
 *
 * Usage:
 * - Use the search bar to find windows or applications
 * - Select a window to see available actions
 * - Use keyboard shortcuts for quick access to actions
 *
 * Display Actions:
 * - "Disperse Windows for Display #X": Distributes windows across spaces on the selected display
 * - "Move to Display #X": Moves the selected window to the specified display
 */

import React from "react";
import { Action, Keyboard, Icon } from "@raycast/api";
import { useExec } from "@raycast/utils";
import {
  handleDisperseWindowsBySpace,
  handleMoveWindowToDisplay,
  handleMoveToDisplaySpace,
  getAvailableDisplays,
  handleInteractiveMoveToDisplay,
  handleMoveToFocusedDisplay,
} from "./handlers";
import { ENV, YABAI, DisplayInfo } from "./models";
import KeyEquivalent = Keyboard.KeyEquivalent;

interface Display {
  id: number;
  uuid: string;
  index: number;
  label: string;
  frame: { x: number; y: number; w: number; h: number };
  spaces: number[];
  "has-focus": boolean;
}

export function DisperseOnDisplayActions() {
  const {
    isLoading,
    data: displays,
    error,
  } = useExec<Display[]>(YABAI, ["-m", "query", "--displays"], {
    env: ENV,
    parseOutput: ({ stdout }) => {
      if (!stdout) return [];
      try {
        // Ensure stdout is a string before parsing
        const stdoutStr = typeof stdout === "string" ? stdout : JSON.stringify(stdout);
        const parsed = JSON.parse(stdoutStr);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error("Error parsing displays data in DisplayActions:", parseError);
        return [];
      }
    },
    keepPreviousData: false,
  });

  if (isLoading) return null;
  if (error) return null;

  return (
    <>
      {displays?.map((display) => (
        <Action
          key={display.id}
          title={`Disperse Windows for Display #${display.index}`}
          onAction={handleDisperseWindowsBySpace(String(display.index))}
          shortcut={{ modifiers: ["opt", "cmd"], key: display.index.toString() as KeyEquivalent }}
        />
      ))}
    </>
  );
}

interface MoveWindowToDisplayActionsProps {
  windowId: number;
  windowApp: string;
}

export function MoveWindowToDisplayActions({ windowId, windowApp }: MoveWindowToDisplayActionsProps) {
  const {
    isLoading,
    data: displays,
    error,
  } = useExec<Display[]>(YABAI, ["-m", "query", "--displays"], {
    env: ENV,
    parseOutput: ({ stdout }) => {
      if (!stdout) return [];
      try {
        // Ensure stdout is a string before parsing
        const stdoutStr = typeof stdout === "string" ? stdout : JSON.stringify(stdout);
        const parsed = JSON.parse(stdoutStr);
        return Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error("Error parsing displays data in MoveWindowToDisplayActions:", parseError);
        return [];
      }
    },
    keepPreviousData: false,
  });

  if (isLoading) return null;
  if (error) return null;

  if (!displays || displays.length <= 1) {
    return <Action title="Move to Another Display (Only 1 Available)" onAction={() => {}} />;
  }

  return (
    <>
      {displays?.map((display) => (
        <Action
          key={display.id}
          title={`Move to Display #${display.index}`}
          onAction={handleMoveWindowToDisplay(windowId, windowApp, String(display.index))}
          shortcut={{ modifiers: ["cmd", "ctrl"], key: display.index.toString() as KeyEquivalent }}
        />
      ))}
    </>
  );
}

interface MoveToDisplaySpaceProps {
  windowId: number;
  windowApp: string;
}

export function MoveToDisplaySpace({ windowId, windowApp }: MoveToDisplaySpaceProps) {
  return (
    <Action
      title="Move to Empty Space on Current Display"
      onAction={handleMoveToDisplaySpace(windowId, windowApp)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
    />
  );
}

interface InteractiveMoveToDisplayActionProps {
  windowId: number;
  windowApp: string;
  windowTitle: string;
}

/**
 * Interactive component that allows users to select a display to move a window to
 * Uses a submenu to show all available displays dynamically
 */
export function InteractiveMoveToDisplayAction({ windowId, windowApp }: InteractiveMoveToDisplayActionProps) {
  const [displays, setDisplays] = React.useState<DisplayInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadDisplays = React.useCallback(async () => {
    if (displays.length > 0) return; // Don't reload if we already have displays

    setIsLoading(true);
    setError(null);
    try {
      const availableDisplays = await getAvailableDisplays();
      setDisplays(availableDisplays);
    } catch (err) {
      console.error("Failed to load displays:", err);
      setError(err instanceof Error ? err.message : "Failed to load displays");
    } finally {
      setIsLoading(false);
    }
  }, [displays.length]);

  // If there's an error or only one display, show a simple action
  if (error) {
    return <Action icon={Icon.ExclamationMark} title="Move to Display (Error)" subtitle={error} onAction={() => {}} />;
  }

  // If loading, show loading state
  if (isLoading) {
    return <Action icon={Icon.Clock} title="Loading Displays…" onAction={() => {}} />;
  }

  // If only one display, show disabled action
  if (displays.length <= 1) {
    return (
      <Action icon={Icon.Desktop} title="Move to Display" subtitle="Only one display available" onAction={() => {}} />
    );
  }

  return (
    <Action.Submenu
      icon={Icon.Desktop}
      title="Move to Display"
      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
      onOpen={loadDisplays}
    >
      <Action
        icon={Icon.Monitor}
        title="Move to Focused Space"
        subtitle="Move to the currently active space"
        onAction={handleMoveToFocusedDisplay(windowId, windowApp)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      />
      <Action.Separator />
      {displays.map((display) => (
        <Action
          key={display.index}
          icon={display.isFocused ? Icon.CheckCircle : Icon.Circle}
          title={`Display ${display.index}`}
          subtitle={`${display.dimensions}${display.isFocused ? " (current)" : ""}`}
          onAction={handleInteractiveMoveToDisplay(windowId, windowApp, display.index)}
        />
      ))}
    </Action.Submenu>
  );
}

interface MoveToFocusedDisplayActionProps {
  windowId: number;
  windowApp: string;
}

/**
 * Quick action to move window to the currently focused space
 */
export function MoveToFocusedDisplayAction({ windowId, windowApp }: MoveToFocusedDisplayActionProps) {
  return (
    <Action
      icon={Icon.Monitor}
      title="Move to Focused Space"
      subtitle="Move to the currently active space"
      onAction={handleMoveToFocusedDisplay(windowId, windowApp)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
    />
  );
}
