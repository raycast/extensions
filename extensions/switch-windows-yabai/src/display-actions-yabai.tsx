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
import { Action, Keyboard } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { handleDisperseWindowsBySpace, handleMoveWindowToDisplay } from "./handlers";
import { ENV, YABAI } from "./models";
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

export function DisplayActions() {
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
          shortcut={{ modifiers: ["ctrl", "cmd"], key: display.index.toString() as KeyEquivalent }}
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
          shortcut={{ modifiers: ["cmd", "shift"], key: display.index.toString() as KeyEquivalent }}
        />
      ))}
    </>
  );
}
