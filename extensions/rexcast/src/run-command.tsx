import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listSessions, rex } from "./lib/rex";

type Values = { session: string; command: string; cwd: string[]; keepOpen: boolean };

export default function Command() {
  const { data, isLoading } = useCachedPromise(() => listSessions());
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run in New Tab"
            icon={Icon.Play}
            onSubmit={async (v: Values) => {
              if (!v.session || !v.command.trim()) {
                await showFailureToast(new Error(v.session ? "Enter a command" : "Pick a session first"), {
                  title: "Nothing ran",
                });
                return false;
              }
              try {
                const args = ["run", "-s", v.session, "--focus=false"];
                if (v.cwd[0]) args.push("-c", v.cwd[0]);
                if (v.keepOpen) args.push("--keep-open");
                await rex(...args, "--", "sh", "-c", v.command);
                await showToast({ title: "Command sent to Rex", style: Toast.Style.Success });
              } catch (e) {
                showFailureToast(e, { title: "Could not run the command" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="session" title="Session">
        {data?.map((s) => (
          <Form.Dropdown.Item key={s.session_id} value={s.session_id} title={s.label} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="command" title="Command" placeholder="npm run dev" />
      <Form.FilePicker
        id="cwd"
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Checkbox id="keepOpen" label="Keep open when it finishes" defaultValue />
    </Form>
  );
}
