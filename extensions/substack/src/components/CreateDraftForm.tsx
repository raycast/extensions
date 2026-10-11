import { readFile } from "node:fs/promises";
import { useRef, useState } from "react";

import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Keyboard,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import { type AccountSummary, resolveAccount } from "@/lib/accounts";
import { type DraftReference, DraftSaveError, createNewsletterDraft } from "@/lib/createDraft";
import { rememberDraft } from "@/lib/recovery";

import AccountSelector from "./AccountSelector";

type Values = { title: string; subtitle: string; markdown: string; files: string[] };

export default function CreateDraftForm({
  accounts,
  accountId,
  onAccountChange,
  onSaved,
}: {
  accounts: AccountSummary[];
  accountId: string;
  onAccountChange: (id: string) => void;
  onSaved?: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);
  const [incompleteDraft, setIncompleteDraft] = useState<DraftReference | null>(null);
  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: { title: "", subtitle: "", markdown: "", files: [] },
    validation: {
      title: (value) => (!value?.trim() ? "Enter a title." : undefined),
    },
    async onSubmit(values) {
      if (submitting.current) return;
      submitting.current = true;
      setIsLoading(true);
      try {
        if (values.files.length && values.markdown.trim()) {
          throw new Error("Choose a Markdown file or paste text, rather than using both.");
        }
        const account = await resolveAccount(accountId);
        const markdown = values.files.length ? await readFile(values.files[0], "utf8") : values.markdown;
        const draft = await createNewsletterDraft(
          { ...account, title: values.title, subtitle: values.subtitle, markdown },
          (created) => rememberDraft(account.id, values.title, created, false),
        );
        try {
          await rememberDraft(account.id, values.title, draft, true);
        } catch {
          throw new DraftSaveError(draft);
        }
        await onSaved?.();
        pop();
        await showToast({ style: Toast.Style.Success, title: "Draft saved in Substack" });
        try {
          await open(draft.editorUrl);
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Draft saved",
            message: "Open List My Drafts to review it.",
          });
        }
      } catch (error) {
        if (error instanceof DraftSaveError) setIncompleteDraft(error.draft);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not save the complete draft",
          message: error instanceof Error ? error.message : "Check Substack before trying again.",
        });
      } finally {
        submitting.current = false;
        setIsLoading(false);
      }
    },
  });

  if (incompleteDraft && !isLoading) {
    return (
      <Detail
        markdown="# Draft needs review\n\nA draft was created, but its content could not be verified. Open it in Substack and check the body before creating another draft."
        actions={
          <ActionPanel>
            <Action
              shortcut={Keyboard.Shortcut.Common.Open}
              title="Open Draft in Substack"
              onAction={() => open(incompleteDraft.editorUrl)}
            />
            <Action
              shortcut={Keyboard.Shortcut.Common.Copy}
              title="Copy Draft URL"
              onAction={() => Clipboard.copy(incompleteDraft.editorUrl)}
            />
            <Action title="View Drafts" onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Create Draft"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Draft" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isLoading ? (
        <Form.Description
          title="Account"
          text={accounts.find((a) => a.id === accountId)?.label ?? "Selected account"}
        />
      ) : (
        <AccountSelector form accounts={accounts} value={accountId} onChange={onAccountChange} />
      )}
      <Form.TextField title="Title" placeholder="Newsletter title" {...itemProps.title} />
      <Form.TextField title="Subtitle" placeholder="Optional subtitle" {...itemProps.subtitle} />
      <Form.TextArea title="Markdown" placeholder="Paste your newsletter body" {...itemProps.markdown} />
      <Form.FilePicker
        title="Markdown File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.files}
      />
      <Form.Description text="Paste Markdown or choose a file. Supports headings, emphasis, links, lists, quotes, and images on their own line with HTTPS URLs. Review the saved draft in Substack to publish it." />
    </Form>
  );
}
