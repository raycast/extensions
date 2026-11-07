import { Action, ActionPanel, Clipboard, Form, Icon, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listSessions, sendText } from "./lib/rex";

type Values = { session: string; text: string; enter: boolean };

export default function Command() {
  const { data, isLoading } = useCachedPromise(() => listSessions());
  const { data: clip } = useCachedPromise(() => Clipboard.readText());
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to Session"
            icon={Icon.Terminal}
            onSubmit={async (v: Values) => {
              if (!v.session || !v.text) {
                await showFailureToast(new Error(v.session ? "The text is empty" : "Pick a session first"), {
                  title: "Nothing sent",
                });
                return false;
              }
              try {
                await sendText(v.session, v.text, v.enter);
                await closeMainWindow();
                await showHUD("Sent to Rex");
              } catch (e) {
                showFailureToast(e, { title: "Could not send the text" });
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
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Text to type into the session"
        defaultValue={clip ?? ""}
        info="Goes to the focused pane of the session."
      />
      <Form.Checkbox id="enter" label="Press Enter after sending" defaultValue={false} />
    </Form>
  );
}
