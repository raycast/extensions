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
              try {
                const args = ["new", ...(v.label.trim() ? [v.label.trim()] : []), "--json"];
                if (v.cwd[0]) args.push("-c", v.cwd[0]);
                if (v.command.trim()) args.push("--", "sh", "-c", v.command);
                const { session_id } = JSON.parse(await rex(...args));
                await showSession(session_id);
                await closeMainWindow();
                await popToRoot();
              } catch (e) {
                showFailureToast(e, { title: "Could not create the session" });
              }
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
