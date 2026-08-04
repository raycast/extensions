// EntryReportForm — pushed view for reporting an entry to its list
// owner's moderation queue from the Search Entries command.
//
// Reached via the "Report Entry" action on a search result row. A
// report is a lightweight flag (wrong, inappropriate, duplicate, etc.)
// that lands in the owner's entry_reports queue, distinct from editing
// (which changes the entry in place) and from a private note (which only
// you see). Offered on every result; whether reports are accepted is the
// list owner's call via the list's reports_mode, enforced server-side.
//
// Fields: a Reason dropdown (the five entry_reports reasons, defaulting
// to "Factual error" as the most common glossary flag) and an optional
// free-text Note. On submit, POST /api/v1/entries/:id/report. If the
// list has reporting turned off the server returns reports_not_enabled,
// which we translate to a clear toast rather than a raw code.

import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { apiFetch, errorMessage } from "../lib/api";

interface FormValues {
  reason: string;
  note: string;
}

// Mirrors the server's entry_reports reason CHECK (migration
// 20260501000000). Ordered with the most common glossary flag first so
// it is the dropdown default.
const REASONS = [
  { value: "factual_error", label: "Factual error" },
  { value: "typo", label: "Typo" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "duplicate", label: "Duplicate" },
  { value: "other", label: "Other" },
];

export function EntryReportForm({
  entryId,
  entryTerm,
  onReported,
}: {
  entryId: number;
  entryTerm: string;
  onReported?: () => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (input) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting report…",
      });
      try {
        await apiFetch(`/api/v1/entries/${entryId}/report`, {
          method: "POST",
          body: JSON.stringify({
            reason: input.reason ?? "other",
            note: input.note ?? "",
          }),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Report submitted";
        onReported?.();
        pop();
      } catch (error) {
        const message = errorMessage(error);
        toast.style = Toast.Style.Failure;
        // reports_not_enabled is the common, non-error case: the list
        // owner simply hasn't turned reporting on. Give it plain copy
        // instead of the raw structured code.
        if (message.includes("reports_not_enabled")) {
          toast.title = "Reporting is off for this list";
          toast.message =
            "The list owner hasn't enabled entry reports. Ask them to turn it on.";
        } else {
          toast.title = "Could not submit report";
          toast.message = message;
        }
      }
    },
    initialValues: { reason: "factual_error", note: "" },
    validation: { reason: FormValidation.Required },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Report"
            icon={Icon.Flag}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Entry" text={entryTerm} />
      <Form.Dropdown title="Reason" {...itemProps.reason}>
        {REASONS.map((r) => (
          <Form.Dropdown.Item key={r.value} value={r.value} title={r.label} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Note"
        placeholder="Optional: add context for the list owner…"
        {...itemProps.note}
      />
    </Form>
  );
}
