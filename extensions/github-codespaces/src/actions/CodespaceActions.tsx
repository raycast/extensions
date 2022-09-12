import { Action, ActionPanel, Icon } from "@raycast/api";
import { preferredEditor } from "../preferences";
import { Codespace } from "../types";
import handleDelete from "../methods/handleDelete";
import ChangeCompute from "../views/ChangeCompute";
import Rename from "../views/Rename";

const OpenWebEditorAction = ({ codespace }: { codespace: Codespace }) => (
  <Action.OpenInBrowser title="Open on web" url={codespace.web_url} />
);
const OpenVSCodeAction = ({ codespace }: { codespace: Codespace }) => (
  <Action.OpenInBrowser
    icon={Icon.Code}
    title="Open in VS Code"
    url={`vscode://github.codespaces/connect?name=${codespace.name}&windowId=_blank`}
  />
);

function CodespaceActions({
  codespace,
  onRevalidate,
}: {
  codespace: Codespace;
  onRevalidate: () => void;
}) {
  const PreferredAction = preferredEditor
    ? preferredEditor === "vscode"
      ? OpenVSCodeAction
      : OpenWebEditorAction
    : OpenVSCodeAction;
  const SecondaryAction = preferredEditor
    ? preferredEditor === "vscode"
      ? OpenWebEditorAction
      : OpenVSCodeAction
    : OpenWebEditorAction;
  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        <PreferredAction codespace={codespace} />
        <SecondaryAction codespace={codespace} />
      </ActionPanel.Section>
      {!codespace.pending_operation && (
        <>
          <ActionPanel.Section title="Update">
            <Action.Push
              title="Rename"
              icon={Icon.Pencil}
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
              onAction={() => handleDelete({ codespace, onRevalidate })}
            />
          </ActionPanel.Section>
        </>
      )}
    </ActionPanel>
  );
}

export default CodespaceActions;
