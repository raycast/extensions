import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { SparkNotInstalled } from "./components/states";
import { isSparkInstalled, runSpark } from "./lib/spark";
import { useAccounts } from "./lib/hooks";

interface DraftForm {
  account: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

const splitAddresses = (raw: string): string[] =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export default function Compose() {
  if (!isSparkInstalled()) return <SparkNotInstalled />;
  return <ComposeView />;
}

function ComposeView() {
  const { triageAccounts, isLoading } = useAccounts();
  if (!isLoading && triageAccounts.length === 0) {
    return <NoTriageAccess />;
  }
  return (
    <ComposeForm
      accounts={triageAccounts.map((a) => a.email)}
      isLoading={isLoading}
    />
  );
}

function ComposeForm({
  accounts,
  isLoading,
}: {
  accounts: string[];
  isLoading: boolean;
}) {
  const { handleSubmit, itemProps } = useForm<DraftForm>({
    onSubmit: async (values) => {
      const args = ["draft"];
      if (values.account) args.push("--account", values.account);
      for (const addr of splitAddresses(values.to)) args.push("--to", addr);
      for (const addr of splitAddresses(values.cc)) args.push("--cc", addr);
      for (const addr of splitAddresses(values.bcc)) args.push("--bcc", addr);
      if (values.subject) args.push("--subject", values.subject);
      if (values.body) args.push("--body", values.body);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating draft…",
      });
      try {
        await runSpark(args);
        toast.style = Toast.Style.Success;
        toast.title = "Draft created in Spark";
        await popToRoot();
      } catch (e) {
        await showFailureToast(e, { title: "Couldn't create draft" });
      }
    },
    validation: {
      to: FormValidation.Required,
      subject: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Draft"
            icon={Icon.Pencil}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {accounts.length > 1 ? (
        <Form.Dropdown title="From" {...itemProps.account}>
          {accounts.map((email) => (
            <Form.Dropdown.Item key={email} value={email} title={email} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField
        title="To"
        placeholder="alice@example.com, bob@example.com"
        {...itemProps.to}
      />
      <Form.TextField title="Cc" placeholder="optional" {...itemProps.cc} />
      <Form.TextField title="Bcc" placeholder="optional" {...itemProps.bcc} />
      <Form.TextField
        title="Subject"
        placeholder="Subject line"
        {...itemProps.subject}
      />
      <Form.TextArea
        title="Body"
        placeholder="Write in markdown…"
        enableMarkdown
        {...itemProps.body}
      />
      <Form.Description text="Creates a draft in Spark Desktop." />
    </Form>
  );
}

function NoTriageAccess() {
  const markdown = `# Triage access required

Composing drafts needs **Triage** access, which Spark gates behind **Spark Premium**.

None of your accounts currently have Triage access — the rest of this extension (Inbox, Search, Calendar, Contacts, Folders) works without it.

**To enable drafting:**
1. Open **Spark Desktop → Settings → AI Agents**.
2. Switch an account from **Read** to **Triage** (requires Premium).
3. Re-open this command.`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
