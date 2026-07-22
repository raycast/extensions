import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { APP_URL, V1Invoice, getSdiIssues } from "./api";
import { ErrorView } from "./components";
import { eur, fmtDate } from "./helpers";

const STATUS_LABELS: Record<string, { label: string; color: Color }> = {
  rejected: { label: "Rejected", color: Color.Red },
  error: { label: "Error", color: Color.Red },
  failed_delivery: { label: "Not delivered", color: Color.Orange },
};

export default function SdiIssues() {
  const { data, isLoading, error, revalidate } = useCachedPromise(getSdiIssues, [], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search problematic invoices…">
      {error ? (
        <ErrorView error={error} />
      ) : (
        <>
          {(data?.items ?? []).map((invoice) => (
            <IssueItem key={invoice.id} invoice={invoice} onRefresh={revalidate} />
          ))}
          <List.EmptyView
            icon={Icon.CheckCircle}
            title="No SDI Issues"
            description="No rejected or undelivered invoices. All good!"
          />
        </>
      )}
    </List>
  );
}

function IssueItem({ invoice, onRefresh }: { invoice: V1Invoice; onRefresh: () => void }) {
  const status = STATUS_LABELS[invoice.sdi_status] ?? { label: invoice.sdi_status, color: Color.SecondaryText };
  const errorText = invoice.sdi_error
    ? [invoice.sdi_error.code, invoice.sdi_error.message].filter(Boolean).join(" · ")
    : null;

  return (
    <List.Item
      icon={{ source: Icon.ExclamationMark, tintColor: status.color }}
      title={invoice.counterpart.name ?? "Unknown client"}
      subtitle={[invoice.number, errorText].filter(Boolean).join(" — ") || undefined}
      accessories={[
        { tag: { value: status.label, color: status.color } },
        { text: eur(invoice.total_amount), tooltip: `Issued ${fmtDate(invoice.issue_date)}` },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Fix in Onesto" icon={Icon.Globe} url={`${APP_URL}/fatture`} />
          {errorText && (
            <Action.CopyToClipboard
              title="Copy Error"
              content={errorText}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}
