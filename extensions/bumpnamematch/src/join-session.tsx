import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { joinSession } from "./lib/api";

/** Form to join an existing naming session by its invite code. */
export function JoinSessionForm({
  baseUrl,
  apiKey,
  onJoined,
}: {
  baseUrl: string;
  apiKey: string;
  onJoined: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    const code = String(values.inviteCode ?? "")
      .trim()
      .toUpperCase();
    if (!code) {
      await showToast({ style: Toast.Style.Failure, title: "Enter an invite code" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Joining session…" });
    const result = await joinSession(baseUrl, apiKey, code);
    if (result.ok) {
      toast.style = Toast.Style.Success;
      toast.title = "Joined session";
      onJoined();
      pop();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't join";
      toast.message = result.error;
    }
  }

  return (
    <Form
      navigationTitle="Join Naming Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Join Session" icon={Icon.TwoPeople} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="inviteCode"
        title="Invite Code"
        placeholder="6-character code from your partner"
        info="Get this from the person who created the session."
      />
    </Form>
  );
}
