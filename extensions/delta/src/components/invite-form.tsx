import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { isEmail, parseEmails } from "../lib/cli";
import { inviteToThread } from "../lib/delta";
import { runWithToast } from "../lib/feedback";
import { getThreadTitle } from "../lib/threads";
import { Thread } from "../lib/types";

/** Invites people to one thread by email. */
export function InviteForm({ thread, onInvited }: { thread: Thread; onInvited?: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ emails: string }>({
    initialValues: { emails: "" },
    validation: {
      emails: (value) => {
        const emails = parseEmails(value ?? "");
        if (emails.length === 0) {
          return "Enter at least one email";
        }
        const invalid = emails.find((email) => !isEmail(email));
        return invalid ? `“${invalid}” isn't a valid email` : undefined;
      },
    },
    async onSubmit({ emails: text }) {
      const emails = parseEmails(text);
      const invited = await runWithToast(
        {
          progress: emails.length === 1 ? "Sending invite" : "Sending invites",
          success: emails.length === 1 ? "Invite sent" : `${emails.length} invites sent`,
          failure: emails.length === 1 ? "Couldn't send invite" : "Couldn't send invites",
        },
        () => inviteToThread(thread, emails),
      );
      if (invited) {
        onInvited?.();
        pop();
      }
    },
  });

  return (
    <Form
      navigationTitle={`Invite to ${getThreadTitle(thread)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Invites" icon={Icon.Envelope} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="People you invite can open the thread and its files. A thread that was never shared is uploaded privately first." />
      <Form.TextArea
        title="Emails"
        placeholder="ann@example.com, bob@example.com"
        info="Separate addresses with commas, spaces or new lines"
        {...itemProps.emails}
      />
    </Form>
  );
}
