import { Action, ActionPanel, Icon } from "@raycast/api";
import { TypeMacro } from "../lib/types";
import { runAppleScript } from "run-applescript";

function editMacro(macro: TypeMacro) {
  runAppleScript(
    `tell application "Keyboard Maestro"
        editMacro "${macro.uid}"
        activate
      end tell`
  );
}

function changeMacro(macro: TypeMacro, enable: boolean) {
  runAppleScript(
    `tell application "Keyboard Maestro"
        setMacroEnable "${macro.uid}" ${enable ? "with" : "without"} enable
      end tell`
  );
}

export function MacroActionPanel({ macro, revalidate }: { macro: TypeMacro; revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action.Open title="Run Macro" target={`kmtrigger://macro=${macro.uid}`} icon={Icon.Terminal} />
      <Action
        title="Edit Macro"
        onAction={() => {
          editMacro(macro);
        }}
        icon={Icon.Pencil}
        shortcut={{ key: "e", modifiers: ["cmd"] }}
      />
      <ActionPanel.Section>
        {macro.enabled ? (
          <Action
            title="Disable Macro"
            icon={Icon.XMarkCircle}
            onAction={() => {
              changeMacro(macro, false);
              revalidate();
            }}
            shortcut={{ key: "d", modifiers: ["cmd", "shift"] }}
          />
        ) : (
          <Action
            title="Enable Macro"
            icon={Icon.CheckCircle}
            onAction={() => {
              changeMacro(macro, true);
              revalidate();
            }}
            shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
          />
        )}
        {macro.uid && (
          <Action.CopyToClipboard
            title="Copy Macro UID"
            content={macro.uid}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>
      <Action
        title="Refetch Macros"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}
