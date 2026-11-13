import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";

import { accountAccessory, AccountIssues, EmptyViewActions, ManageAccountsAction } from "./components/accounts";
import { RefreshAction, withToast } from "./components/actions";
import { CardActions } from "./components/card-actions";
import { ensureAccount, type From, gather, type Notification } from "./lib/hackban";

function describe(n: Notification) {
  if (n.type === "addedToCard") return "Added you to the card";
  if (n.type === "commentCard") return n.text ? `Commented: ${n.text}` : "Commented";
  return n.type;
}

function icon(n: Notification) {
  const source = n.type === "addedToCard" ? Icon.AddPerson : n.type === "commentCard" ? Icon.Bubble : Icon.Bell;
  return n.read ? source : { source, tintColor: Color.Blue };
}

const fetchNotifications = () => gather((api) => api.notifications());

/** Marks every account's notifications read, and fails if any account couldn't. */
async function markAllReadEverywhere() {
  const r = await gather((api) => api.notifications(true));
  const failed = [...r.signedOut, ...r.errors.map((e) => e.account)];
  if (failed.length) throw new Error(`Couldn't reach ${failed.map((a) => a.label).join(", ")}`);
  return r;
}

function Notifications() {
  const { data, isLoading, revalidate, mutate } = useCachedPromise(fetchNotifications, []);
  const accounts = data?.accounts ?? [];
  const all: From<Notification>[] = (data?.results ?? [])
    .flatMap(({ account, data }) => data.map((n) => ({ ...n, account })))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const unread = all.filter((n) => !n.read);
  const read = all.filter((n) => n.read);

  const markAllRead = unread.length > 0 && (
    <Action
      title="Mark All as Read"
      icon={Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={() =>
        withToast({ loading: "Marking all as read", success: "All caught up", failure: "Couldn't mark as read" }, () =>
          mutate(markAllReadEverywhere(), {
            optimisticUpdate: (d) =>
              d && {
                ...d,
                results: d.results.map((r) => ({ ...r, data: r.data.map((n) => ({ ...n, read: true })) })),
              },
          }),
        )
      }
    />
  );

  const item = (n: From<Notification>, i: number) => (
    <List.Item
      key={`${n.account.id}:${n.at}:${i}`}
      title={n.title ?? "Card"}
      subtitle={describe(n)}
      icon={icon(n)}
      keywords={[n.account.label]}
      accessories={[
        ...(n.by ? [{ text: n.by, icon: Icon.Person }] : []),
        { date: new Date(n.at) },
        ...accountAccessory(n.account, accounts),
      ]}
      actions={
        n.cardId && n.url ? (
          <CardActions
            account={n.account}
            card={{ id: n.cardId, title: n.title ?? "Card", url: n.url }}
            onChange={revalidate}
          >
            {markAllRead}
          </CardActions>
        ) : (
          <ActionPanel>
            {markAllRead}
            <RefreshAction onRefresh={revalidate} />
            <ManageAccountsAction onChange={revalidate} />
          </ActionPanel>
        )
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter notifications">
      <List.EmptyView
        icon={Icon.Bell}
        title="No notifications"
        description="You'll hear about cards you're added to and comments on cards you watch."
        actions={<EmptyViewActions onRefresh={revalidate} />}
      />
      <AccountIssues data={data} onFixed={revalidate} />
      <List.Section title="Unread" subtitle={unread.length ? String(unread.length) : undefined}>
        {unread.map(item)}
      </List.Section>
      <List.Section title="Earlier">{read.map(item)}</List.Section>
    </List>
  );
}

export default withAccessToken({ authorize: ensureAccount })(Notifications);
