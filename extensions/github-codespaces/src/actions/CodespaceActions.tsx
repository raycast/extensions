import { Action, ActionPanel, Clipboard, Icon } from "@raycast/api";
import { preferredEditor } from "../preferences";
import { Client, clientNames, Codespace } from "../types";
import handleDelete from "../methods/handleDelete";
import ChangeCompute from "../views/ChangeCompute";
import Rename from "../views/Rename";
import { handleStop } from "../methods/handleStop";
import { launchEditor } from "../utils/launchEditor";

function CodespaceActions({
  codespace,
  onRevalidate,
}: {
  codespace: Codespace;
  onRevalidate: () => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        <Action
          title={`Open in ${clientNames[preferredEditor]}`}
          onAction={() => launchEditor({ codespace })}
        />
        {Object.keys(clientNames).map((c) => {
          if (c === preferredEditor) return null;
          return (
            <Action
              key={c}
              title={`Open in ${clientNames[c as Client]}`}
              onAction={() => launchEditor({ codespace, client: c as Client })}
            />
          );
        })}
      </ActionPanel.Section>
      {!codespace.pending_operation && (
        <>
          <ActionPanel.Section title="Update">
            {codespace.state === "Available" && (
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={() => handleStop({ codespace }).finally(onRevalidate)}
              />
            )}
            <Action.Push
              title="Rename"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              target={
                <Rename codespace={codespace} onRevalidate={onRevalidate} />
              }
            />
            <Action.Push
              title="Change compute"
              icon={Icon.ComputerChip}
              target={
                <ChangeCompute
                  codespace={codespace}
                  onRevalidate={onRevalidate}
                />
              }
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={() => handleDelete({ codespace }).finally(onRevalidate)}
            />
          </ActionPanel.Section>
        </>
      )}
    </ActionPanel>
  );
}

export default CodespaceActions;
