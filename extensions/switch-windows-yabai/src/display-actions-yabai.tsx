import React from "react";
import { Action } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { handleDisperseWindowsBySpace } from "./handlers";
import { ENV, YABAI } from "./models";

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
        const parsed = JSON.parse(stdout);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
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
          shortcut={{ modifiers: ["cmd", "shift"], key: display.index.toString() }}
        />
      ))}
    </>
  );
}
