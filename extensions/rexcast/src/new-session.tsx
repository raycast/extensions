import { Action, ActionPanel, Form, Icon, closeMainWindow, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { rex, showSession } from "./lib/rex";

type Values = { label: string; cwd: string[]; command: string };

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create and Show"
            icon={Icon.Plus}
            onSubmit={async (v: Values) => {
              let sessionId: string;
              try {
                const args = ["new", ...(v.label.trim() ? [v.label.trim()] : []), "--json"];
                if (v.cwd[0]) args.push("-c", v.cwd[0]);
                if (v.command.trim()) args.push("--", "sh", "-c", v.command);
                sessionId = JSON.parse(await rex(...args)).session_id;
              } catch (e) {
                await showFailureToast(e, { title: "Could not create the session" });
                return false;
              }
              // The session exists now: a failure to show it must not look like a failure to create it.
              try {
                await showSession(sessionId);
              } catch (e) {
                await showFailureToast(e, {
                  title: "Session created, but Rex could not show it",
                  message: "Turn on Remote Control in Rex's settings to switch sessions from Raycast.",
                });
              }
              await closeMainWindow();
              await popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="label" title="Name" placeholder="my-project" />
      <Form.FilePicker
        id="cwd"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField
        id="command"
        title="Command"
        placeholder="Empty = shell"
        info="Runs with sh -c when the session opens."
      />
    </Form>
  );
}
