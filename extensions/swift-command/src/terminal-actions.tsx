import { Action } from "@raycast/api";
import { Terminal } from "./types";
import { executeInTerminal } from "./terminals";

interface TerminalActionsProps {
  terminals: Terminal[];
  command: string;
  onExecute?: () => void;
}

/**
 * Reusable component that renders terminal execution actions with shortcuts
 */
export function TerminalActions({ terminals, command, onExecute }: TerminalActionsProps) {
  async function handleExecuteInTerminal(terminal: Terminal) {
    await executeInTerminal(command, terminal);
    onExecute?.();
  }

  return (
    <>
      {terminals.map((terminal) => {
        type KeyEquivalent = "t" | "i" | "w" | "h" | "g";
        // System default terminal (Terminal.app with key "t") uses Cmd+T, others use Cmd+Shift+Key
        const isSystemDefaultTerminal = terminal.key === "t";
        return (
          <Action
            key={terminal.key}
            title={`Run in ${terminal.name}`}
            icon={{ fileIcon: terminal.application.path }}
            onAction={() => handleExecuteInTerminal(terminal)}
            shortcut={{
              modifiers: isSystemDefaultTerminal ? ["cmd"] : ["cmd", "shift"],
              key: terminal.key as KeyEquivalent,
            }}
          />
        );
      })}
    </>
  );
}
