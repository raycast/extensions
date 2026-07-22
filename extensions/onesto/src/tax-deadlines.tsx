import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { APP_URL, TaxDeadline, getTaxDeadlines, markTaxPaid } from "./api";
import { ErrorView } from "./components";
import { daysLate, eur, fmtDate, isoDaysFromNow, todayIso } from "./helpers";

async function fetchAll() {
  // The /v1 status filter accepts one value per request → three parallel calls.
  const [overdue, dueToday, upcoming] = await Promise.all([
    getTaxDeadlines("overdue"),
    getTaxDeadlines("due_today"),
    getTaxDeadlines("upcoming", isoDaysFromNow(120)),
  ]);
  return { overdue: overdue.items, dueToday: dueToday.items, upcoming: upcoming.items };
}

export default function TaxDeadlines() {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchAll, [], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tax deadlines…">
      {error ? (
        <ErrorView error={error} />
      ) : (
        <>
          {(data?.overdue.length ?? 0) > 0 && (
            <List.Section title="Overdue" subtitle={`${data?.overdue.length}`}>
              {data?.overdue.map((d) => (
                <DeadlineItem key={d.id} deadline={d} onChange={revalidate} />
              ))}
            </List.Section>
          )}
          {(data?.dueToday.length ?? 0) > 0 && (
            <List.Section title="Due Today" subtitle={`${data?.dueToday.length}`}>
              {data?.dueToday.map((d) => (
                <DeadlineItem key={d.id} deadline={d} onChange={revalidate} />
              ))}
            </List.Section>
          )}
          {(data?.upcoming.length ?? 0) > 0 && (
            <List.Section title="Next 120 Days" subtitle={`${data?.upcoming.length}`}>
              {data?.upcoming.map((d) => (
                <DeadlineItem key={d.id} deadline={d} onChange={revalidate} />
              ))}
            </List.Section>
          )}
          <List.EmptyView
            icon={Icon.CheckCircle}
            title="No Tax Deadlines"
            description="Nothing due in the next 120 days."
          />
        </>
      )}
    </List>
  );
}

const TYPE_LABELS: Record<string, string> = {
  f24: "F24",
  iva: "VAT",
  inps: "INPS",
  lipe: "LIPE",
  dichiarazione: "Tax return",
  other: "Other",
};

function DeadlineItem({ deadline, onChange }: { deadline: TaxDeadline; onChange: () => void }) {
  const late = daysLate(deadline.due_date);
  const isOverdue = deadline.status === "overdue";
  const isToday = deadline.status === "due_today";

  const accessories: List.Item.Accessory[] = [
    { tag: { value: TYPE_LABELS[deadline.type] ?? deadline.type, color: Color.SecondaryText } },
  ];
  if (deadline.due_date) {
    accessories.push({
      tag: isOverdue
        ? { value: `${fmtDate(deadline.due_date)} · ${late}d late`, color: Color.Red }
        : isToday
          ? { value: "today", color: Color.Orange }
          : { value: fmtDate(deadline.due_date), color: Color.SecondaryText },
    });
  }
  accessories.push({ text: eur(deadline.amount) });

  return (
    <List.Item
      icon={
        isOverdue
          ? { source: Icon.ExclamationMark, tintColor: Color.Red }
          : isToday
            ? { source: Icon.Clock, tintColor: Color.Orange }
            : Icon.Calendar
      }
      title={deadline.title}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {deadline.file_url && (
              <Action.OpenInBrowser title="Open F24 PDF" icon={Icon.Document} url={deadline.file_url} />
            )}
            <Action.Push
              title="Mark as Paid"
              icon={Icon.CheckCircle}
              target={<MarkPaidForm deadline={deadline} onDone={onChange} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
            <Action.OpenInBrowser
              title="Open in Onesto"
              icon={Icon.Globe}
              url={`${APP_URL}/tasse`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Amount"
              content={deadline.amount.toFixed(2)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onChange}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function MarkPaidForm({ deadline, onDone }: { deadline: TaxDeadline; onDone: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: { paidDate: Date | null; reference: string }) {
    const confirmed = await confirmAlert({
      title: "Mark as Paid?",
      message: `"${deadline.title}" (${eur(deadline.amount)}) will be marked as paid in Onesto. Only do this if you actually paid it.`,
      primaryAction: { title: "Mark as Paid", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Marking as paid…" });
    try {
      await markTaxPaid(
        deadline.id,
        values.paidDate ? values.paidDate.toISOString().slice(0, 10) : todayIso(),
        values.reference || undefined,
      );
      toast.style = Toast.Style.Success;
      toast.title = "Marked as paid";
      onDone();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not mark as paid";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      navigationTitle={`Mark as Paid · ${deadline.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Mark as Paid" icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Deadline" text={`${deadline.title} · ${eur(deadline.amount)}`} />
      <Form.DatePicker id="paidDate" title="Paid On" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />
      <Form.TextField id="reference" title="Payment Reference" placeholder="Optional (e.g. bank reference)" />
    </Form>
  );
}
