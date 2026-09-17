import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { ThreadView } from "./thread-view";
import { parseEmailTable, runSpark, type EmailRow } from "../lib/spark";
import { useAccounts } from "../lib/hooks";
import { isUnread, senderName, shorten, toRelative } from "../lib/format";

const PAGE_SIZE = 50;

/** Paginated list of emails produced by a `spark` command (emails/search/folder). */
export function EmailList({
  navigationTitle,
  args,
}: {
  navigationTitle?: string;
  args: string[];
}) {
  const { hasTriage } = useAccounts();

  const { data, isLoading, error, revalidate, pagination } = usePromise(
    (key: string) => async (options: { page: number }) => {
      const base = JSON.parse(key) as string[];
      const out = await runSpark([
        ...base,
        "--page-size",
        String(PAGE_SIZE),
        "--page",
        String(options.page + 1),
      ]);
      const rows = parseEmailTable(out);
      return { data: rows, hasMore: rows.length >= PAGE_SIZE };
    },
    [JSON.stringify(args)],
  );

  if (error) showFailureToast(error, { title: "Couldn't load emails" });

  const rows = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Filter loaded emails…"
    >
      {!isLoading && rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No emails"
          description="Nothing here."
        />
      ) : (
        rows.map((row, i) => (
          <EmailItem
            key={`${row.id}-${i}`}
            row={row}
            canTriage={hasTriage(row.account)}
            onChange={revalidate}
          />
        ))
      )}
    </List>
  );
}

export function EmailItem({
  row,
  canTriage,
  onChange,
}: {
  row: EmailRow;
  canTriage: boolean;
  onChange: () => void;
}) {
  const unread = isUnread(row.flags);
  const accessories: List.Item.Accessory[] = [];
  if (row.account) accessories.push({ tag: row.account });
  if (row.date) accessories.push({ text: toRelative(row.date) });

  return (
    <List.Item
      icon={
        unread
          ? { source: Icon.Dot, tintColor: Color.Blue, tooltip: "Unread" }
          : {
              source: Icon.Circle,
              tintColor: Color.SecondaryText,
              tooltip: "Read",
            }
      }
      title={shorten(row.subject || "(no subject)", 60)}
      subtitle={shorten(senderName(row.from), 28)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Read Thread"
              icon={Icon.Book}
              target={<ThreadView id={row.id} subject={row.subject} />}
            />
          </ActionPanel.Section>
          {canTriage ? (
            <ActionPanel.Section>
              <TriageAction
                id={row.id}
                action="archive"
                title="Archive"
                icon={Icon.Tray}
                onChange={onChange}
              />
              <TriageAction
                id={row.id}
                action="pin"
                title="Pin"
                icon={Icon.Pin}
                onChange={onChange}
              />
              <TriageAction
                id={row.id}
                action="markAsSeen"
                title="Mark as Read"
                icon={Icon.Checkmark}
                onChange={onChange}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Subject"
              content={row.subject}
            />
            <Action.CopyToClipboard
              title="Copy Email ID"
              content={row.id}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "." },
                Windows: { modifiers: ["ctrl", "shift"], key: "." },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function TriageAction(props: {
  id: string;
  action: string;
  title: string;
  icon: Icon;
  onChange: () => void;
}) {
  const { id, action, title, icon, onChange } = props;
  return (
    <Action
      title={title}
      icon={icon}
      onAction={async () => {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `${title}…`,
        });
        try {
          await runSpark(["action", action, id]);
          toast.style = Toast.Style.Success;
          toast.title = `${title} done`;
          onChange();
        } catch (e) {
          await showFailureToast(e, { title: `${title} failed` });
        }
      }}
    />
  );
}
