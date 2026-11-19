import { useRef } from "react";
import { logger } from "@chrismessina/raycast-logger";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm, useFrecencySorting } from "@raycast/utils";
import { NoJournalsEmptyView, SetupEmptyView } from "./components/setup-empty-view";
import { writeEntry } from "./lib/api";
import { failToast, uploadAfterSaving } from "./lib/feedback";
import { useAutoSync } from "./lib/use-auto-sync";
import { useRebuildNews } from "./lib/use-rebuild-news";
import { demoScoped, isDemo } from "./lib/demo";
import { useJournals } from "./lib/use-journals";
import { unsavedRemainder } from "./lib/parse";

const log = logger.child("[add-entry]");

const JOURNAL_FRECENCY = "write-journals";

type Values = { journalId: string; body: string; date: Date | null };

/** The journal field's value until you pick one. Not empty, since an empty-valued dropdown item may not survive a draft. */
const NO_JOURNAL = "none";

const emptyValues = (): Values => ({ body: "", date: new Date(), journalId: NO_JOURNAL });

/** Raycast saves an unsent form as a draft, but only restores it through `draftValues`. A saved date may come back as text. */
function restoredDate(value: unknown): Date | null {
  if (value === null) return null;
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : new Date();
}

export default function Command(props: LaunchProps<{ draftValues: Partial<Values> }>) {
  const draft = isDemo() ? undefined : props.draftValues;
  if (draft) {
    log.debug("draft restored", {
      fields: Object.keys(draft),
      chars: draft.body?.length ?? 0,
      journal: Boolean(draft.journalId && draft.journalId !== NO_JOURNAL),
    });
  }
  const { syncAfterSaving } = getPreferenceValues<Preferences.AddEntry>();
  const journals = useJournals();
  const { data: sortedJournals, visitItem } = useFrecencySorting(journals.data, {
    key: (j) => j.id,
    namespace: demoScoped(JOURNAL_FRECENCY),
  });
  useRebuildNews();
  const autoSync = useAutoSync({
    ready: Boolean(journals.data) && !journals.error,
    empty: journals.data?.length === 0,
    onSynced: journals.revalidate,
  });
  const saving = useRef(false);
  const unsavedBody = useRef("");

  const {
    handleSubmit,
    itemProps,
    reset,
    values: current,
  } = useForm<Values>({
    initialValues: draft
      ? { body: draft.body ?? "", date: restoredDate(draft.date), journalId: draft.journalId || NO_JOURNAL }
      : emptyValues(),
    validation: {
      journalId: (value) => (!value || value === NO_JOURNAL ? "Choose a journal" : undefined),
      body: FormValidation.Required,
    },
    async onSubmit(values) {
      if (saving.current) return;
      saving.current = true;
      const journal = journals.data?.find((j) => j.id === values.journalId);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding Entry…" });
      const saved = `Added to ${journal?.name ?? "Day One"}`;
      try {
        await writeEntry({ journalId: values.journalId, body: values.body, date: values.date ?? undefined });
        log.debug("entry saved locally", { chars: values.body.length, dated: Boolean(values.date) });
      } catch (error) {
        await failToast(error, "Couldn't Add Entry", toast);
        saving.current = false;
        return;
      }
      if (journal) void visitItem(journal);
      // The form stays editable while the CLI writes, so keep anything typed since Submit.
      const remainder = unsavedRemainder(values.body, unsavedBody.current);
      reset({ ...emptyValues(), body: remainder });
      if (!syncAfterSaving) {
        toast.style = Toast.Style.Success;
        toast.title = saved;
        toast.message = "It uploads on the next sync";
        saving.current = false;
        if (!remainder) await popToRoot();
        return;
      }
      try {
        if ((await uploadAfterSaving(toast, saved)) && !unsavedBody.current) await popToRoot();
      } finally {
        saving.current = false;
      }
    },
  });

  unsavedBody.current = current.body ?? "";
  const target = journals.data?.find((j) => j.id === current.journalId);

  if (journals.error || (journals.data && journals.data.length === 0)) {
    return (
      <List isLoading={autoSync.isSyncing}>
        {journals.error ? (
          <SetupEmptyView error={journals.error} onRetry={journals.revalidate} />
        ) : (
          <NoJournalsEmptyView syncing={autoSync.isSyncing} onSynced={journals.revalidate} />
        )}
      </List>
    );
  }

  return (
    <Form
      isLoading={journals.isLoading || autoSync.isSyncing}
      enableDrafts={!isDemo()}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={target ? `Add to ${target.name}` : "Add Entry"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Journal" {...itemProps.journalId}>
        {itemProps.journalId.value === NO_JOURNAL && (
          <Form.Dropdown.Item value={NO_JOURNAL} title="Choose a Journal" icon={Icon.Book} />
        )}
        {sortedJournals.map((j) => (
          <Form.Dropdown.Item key={j.id} value={j.id} title={j.name} icon={{ source: Icon.Book, tintColor: j.color }} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Entry" placeholder="What's on your mind?" enableMarkdown {...itemProps.body} />
      <Form.DatePicker title="Date" {...itemProps.date} />
    </Form>
  );
}
