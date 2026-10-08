import { useEffect, useRef, useState } from "react";

import { Action, ActionPanel, Detail, Form, Keyboard, Toast, open, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { type AccountConnection, resolveAccount } from "@/lib/accounts";
import { draftMarkdown, markdownBody } from "@/lib/draftMarkdown";
import { DraftEditError, type EditableDraft, loadDraft, saveDraft } from "@/lib/editDraft";
import { publicationOrigin } from "@/lib/substackClient";

type Values = { title: string; subtitle: string; markdown: string };
export default function EditDraftForm({
  accountId,
  draftId,
  editorUrl,
}: {
  accountId: string;
  draftId: number;
  editorUrl: string;
}) {
  const { pop } = useNavigation();
  const [loaded, setLoaded] = useState<{ account: AccountConnection; draft: EditableDraft; markdown?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const submitting = useRef(false);
  const { itemProps, setValue, handleSubmit } = useForm<Values>({
    initialValues: { title: "", subtitle: "", markdown: "" },
    validation: { title: (v) => (!v?.trim() ? "Enter a title." : undefined) },
    async onSubmit(values) {
      if (!loaded || loading || submitting.current || error) return;
      submitting.current = true;
      setLoading(true);
      try {
        const account = await resolveAccount(accountId);
        if (publicationOrigin(account.publication) !== publicationOrigin(loaded.account.publication))
          throw new Error("The draft's connection changed. Reload it before saving.");
        const body =
          loaded.markdown === undefined || values.markdown === loaded.markdown
            ? loaded.draft.body
            : markdownBody(values.markdown);
        await saveDraft(account, loaded.draft, { title: values.title, subtitle: values.subtitle, body });
        await showToast({ style: Toast.Style.Success, title: "Draft changes saved" });
        pop();
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not save draft changes.";
        if (e instanceof DraftEditError) setError(message);
        await showToast({ style: Toast.Style.Failure, title: "Could not save draft changes", message });
      } finally {
        submitting.current = false;
        setLoading(false);
      }
    },
  });
  async function load() {
    if (submitting.current) return;
    const requestId = ++generation.current;
    setLoading(true);
    setLoaded(undefined);
    setError(undefined);
    try {
      const account = await resolveAccount(accountId);
      if (editorUrl !== `${publicationOrigin(account.publication)}/publish/post/${draftId}`)
        throw new Error("The draft's connection changed. Open it in Substack.");
      const draft = await loadDraft(account, draftId);
      if (generation.current !== requestId) return;
      const markdown = draftMarkdown(draft.body);
      setLoaded({ account, draft, markdown });
      setValue("title", draft.title);
      setValue("subtitle", draft.subtitle);
      setValue("markdown", markdown ?? "");
    } catch (e) {
      if (generation.current === requestId) setError(e instanceof Error ? e.message : "Could not load draft.");
    } finally {
      if (generation.current === requestId) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [accountId, draftId, editorUrl]);
  const browser = (
    <Action title="Open Draft in Substack" shortcut={Keyboard.Shortcut.Common.Open} onAction={() => open(editorUrl)} />
  );
  const reload = <Action title="Reload Draft" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={load} />;
  if (!loaded || error)
    return (
      <Detail
        isLoading={loading}
        markdown={error ?? "Loading draft…"}
        actions={
          <ActionPanel>
            {browser}
            {reload}
          </ActionPanel>
        }
      />
    );
  return (
    <Form
      navigationTitle="Edit Draft"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
          {browser}
          {reload}
        </ActionPanel>
      }
    >
      <Form.Description title="Account" text={`${loaded.account.label} (${loaded.account.publication})`} />
      <Form.TextField title="Title" {...itemProps.title} />
      <Form.TextField title="Subtitle" {...itemProps.subtitle} />
      {loaded.markdown !== undefined ? (
        <Form.TextArea title="Markdown" {...itemProps.markdown} />
      ) : (
        <Form.Description text="This draft has rich content. Its body will be preserved when you save title or subtitle changes. Open it in Substack to edit the full body." />
      )}
    </Form>
  );
}
