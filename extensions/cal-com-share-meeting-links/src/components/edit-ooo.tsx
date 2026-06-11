import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Form,
  Icon,
  Image,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { CalOOOEntry, CalOOOReason, createOOO, deleteOOO, updateOOO, useTeammates } from "@api/cal.com";
import {
  formatDateRange,
  fromUtcEnd,
  fromUtcStart,
  iconForReason,
  labelForReason,
  OOO_REASONS,
  toUtcEnd,
  toUtcStart,
} from "@/lib/ooo";

interface EditOOOProps {
  /** When editing, the existing entry. Undefined means "create new". */
  entry?: CalOOOEntry;
  mutate: MutatePromise<CalOOOEntry[] | undefined>;
  /**
   * When this form is the root of a top-level command (not pushed),
   * pass `enableDrafts` so Raycast preserves form state on exit.
   * Drafts are NOT supported when this form is pushed via Action.Push.
   */
  enableDrafts?: boolean;
  /** Restored draft values from a previous session (forwarded by Raycast via LaunchProps). */
  draftValues?: Partial<Values>;
}

export interface Values {
  start: Date | null;
  end: Date | null;
  reason: string; // narrowed back to CalOOOReason on submit
  toUserId: string; // dropdown values are strings; "" means none
  notes: string;
}

const NO_REDIRECT = "";

export function EditOOO({ entry, mutate, enableDrafts, draftValues }: EditOOOProps) {
  const { pop } = useNavigation();
  const { data: teammates, isLoading: isLoadingTeammates } = useTeammates();

  const initialValues: Values = {
    start: draftValues?.start ?? (entry ? fromUtcStart(entry.start) : null),
    end: draftValues?.end ?? (entry ? fromUtcEnd(entry.end) : null),
    reason: draftValues?.reason ?? entry?.reason ?? "unspecified",
    toUserId: draftValues?.toUserId ?? (entry?.toUserId ? String(entry.toUserId) : NO_REDIRECT),
    notes: draftValues?.notes ?? entry?.notes ?? "",
  };

  const apply = async (values: Values) => {
    if (!values.start || !values.end) return;
    if (values.end < values.start) {
      await showToast({ style: Toast.Style.Failure, title: "End must be on or after start" });
      return;
    }
    const payload = {
      start: toUtcStart(values.start),
      end: toUtcEnd(values.end),
      reason: values.reason as CalOOOReason,
      notes: values.notes.trim() || undefined,
      toUserId: values.toUserId === NO_REDIRECT ? undefined : Number(values.toUserId),
    };

    const verb = entry ? "Updating" : "Creating";
    const past = entry ? "updated" : "created";
    const toast = await showToast({ style: Toast.Style.Animated, title: `${verb} OOO entry` });
    try {
      if (entry) {
        await mutate(updateOOO(entry.id, payload), {
          optimisticUpdate: (entries) =>
            entries?.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    ...payload,
                    notes: payload.notes ?? null,
                    toUserId: payload.toUserId ?? null,
                  }
                : e,
            ),
        });
      } else {
        // Look up the selected teammate so the optimistic row can show the
        // redirect target's avatar/name immediately, rather than only after
        // the API response includes the embedded `toUser` object.
        const selectedTeammate =
          payload.toUserId !== undefined ? teammates?.find((t) => t.id === payload.toUserId) : undefined;
        const synthetic: CalOOOEntry = {
          id: -Date.now(),
          uuid: "",
          userId: 0,
          start: payload.start,
          end: payload.end,
          reason: payload.reason,
          notes: payload.notes ?? null,
          toUserId: payload.toUserId ?? null,
          toUser: selectedTeammate
            ? {
                id: selectedTeammate.id,
                name: selectedTeammate.name,
                username: selectedTeammate.username,
                email: selectedTeammate.email,
                avatarUrl: selectedTeammate.avatarUrl,
              }
            : null,
        };
        await mutate(createOOO(payload), {
          optimisticUpdate: (entries) => {
            const next = entries ? [...entries, synthetic] : [synthetic];
            return next.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          },
        });
      }
      toast.style = Toast.Style.Success;
      toast.title = `OOO ${past}`;
    } catch (err) {
      await showFailureToast(err, { title: `Failed to ${entry ? "update" : "create"} OOO` });
      return; // leave form open so user can retry
    }
    pop();
  };

  const { itemProps, handleSubmit } = useForm<Values>({
    onSubmit: apply,
    validation: {
      start: (v) => (v ? undefined : "Start date is required"),
      end: (v) => (v ? undefined : "End date is required"),
    },
    initialValues,
  });

  const showRedirect = !isLoadingTeammates && (teammates?.length ?? 0) > 0;

  const handleDelete = async () => {
    if (!entry) return;
    const confirmed = await confirmAlert({
      title: "Delete OOO entry?",
      message: formatDateRange(entry.start, entry.end),
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting OOO entry" });
    try {
      await mutate(deleteOOO(entry.id), {
        optimisticUpdate: (list) => list?.filter((e) => e.id !== entry.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "OOO entry deleted";
    } catch (err) {
      await showFailureToast(err, { title: "Failed to delete OOO entry" });
      return; // don't pop on failure so user can retry
    }
    pop();
  };

  return (
    <Form
      navigationTitle={entry ? "Edit Out of Office" : "New Out of Office"}
      isLoading={isLoadingTeammates}
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={entry ? "Save" : "Create"} icon={Icon.Check} onSubmit={handleSubmit} />
          {entry && (
            <Action
              title="Delete OOO"
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.DatePicker title="Start" type={Form.DatePicker.Type.Date} {...itemProps.start} />
      <Form.DatePicker title="End" type={Form.DatePicker.Type.Date} {...itemProps.end} />
      <Form.Dropdown title="Reason" {...itemProps.reason}>
        {OOO_REASONS.map((r) => (
          <Form.Dropdown.Item key={r} value={r} title={labelForReason(r)} icon={iconForReason(r)} />
        ))}
      </Form.Dropdown>
      {showRedirect && (
        <Form.Dropdown title="Redirect To" {...itemProps.toUserId}>
          <Form.Dropdown.Item value={NO_REDIRECT} title="(none)" icon={Icon.Minus} />
          {teammates!.map((t) => (
            <Form.Dropdown.Item
              key={t.id}
              value={String(t.id)}
              title={t.name ?? t.email}
              icon={t.avatarUrl ? { source: t.avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
              keywords={[t.email, t.username ?? "", t.teamName].filter(Boolean) as string[]}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea title="Notes" placeholder="Optional context" {...itemProps.notes} />
      {!showRedirect && !isLoadingTeammates && (
        <Form.Description
          title="Redirect"
          text="No teammates available. To set a redirect target, use the cal.com web UI."
        />
      )}
    </Form>
  );
}
