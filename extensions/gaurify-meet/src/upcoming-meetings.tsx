import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { appUrl, cancelBooking, getBooking, getMe, getUpcoming, type Booking, type BookingDetail } from "./lib/api";
import { firstName, groupByDay, isJoinable, isLive, longWhen, minutes, money, time } from "./lib/format";
import { ErrorEmptyView, MEET_ICON, failToast, modeIcon } from "./lib/ui";

export default function Command() {
  const [showDetail, setShowDetail] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(getUpcoming, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn't load meetings" },
    onError: () => undefined,
  });
  const me = useCachedPromise(getMe, [], { onError: () => undefined });
  const detail = useCachedPromise((id: string) => getBooking(id), [selected ?? ""], {
    execute: !!selected && showDetail,
    onError: () => undefined,
  });

  async function cancel(b: Booking) {
    const paid = !!b.payment_status;
    const ok = await confirmAlert({
      title: `Cancel your meeting with ${firstName(b.guest_name)}?`,
      message: `${longWhen(b.start_utc)}. ${b.guest_name} gets an email and the time opens again.${paid ? " They are refunded in full." : ""}`,
      icon: Icon.Trash,
      primaryAction: { title: "Cancel Meeting", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep It" },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling" });
    try {
      await mutate(cancelBooking(b.id), {
        optimisticUpdate: (list) => (list || []).filter((x) => x.id !== b.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Meeting cancelled";
      toast.message = `${b.guest_name} has been told.`;
    } catch (e) {
      toast.hide();
      await failToast(e, "Couldn't cancel");
    }
  }

  if (error && !data) {
    return (
      <List>
        <ErrorEmptyView error={error} onRetry={revalidate} />
      </List>
    );
  }

  const groups = groupByDay(data || [], (b) => b.start_utc);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && groups.length > 0}
      searchBarPlaceholder="Search by guest, email or type"
      onSelectionChange={(id) => setSelected(id ?? null)}
    >
      {groups.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={MEET_ICON}
          title="No upcoming meetings"
          description="A clear calendar. Share your link when you are ready."
          actions={
            <ActionPanel>
              {me.data ? <Action.CopyToClipboard title="Copy Your Booking Link" content={me.data.pageUrl} /> : null}
              <Action.OpenInBrowser title="Open Gaurify Meet" url={appUrl()} />
            </ActionPanel>
          }
        />
      ) : null}
      {groups.map((g) => (
        <List.Section key={g.label} title={g.label} subtitle={`${g.items.length}`}>
          {g.items.map((b) => {
            const join = isJoinable(b);
            const live = isLive(b);
            const type = b.type_title || b.team_title || "Meeting";
            return (
              <List.Item
                key={b.id}
                id={b.id}
                icon={modeIcon(b)}
                title={time(b.start_utc)}
                subtitle={showDetail ? b.guest_name : `${b.guest_name}  ·  ${type}`}
                keywords={[b.guest_name, b.guest_email, type]}
                accessories={[
                  ...(join ? [{ tag: { value: live ? "Live" : "Join", color: Color.Green } }] : []),
                  ...(showDetail ? [] : [{ text: minutes(b.duration_min), icon: Icon.Clock }]),
                ]}
                detail={<Detail booking={b} extra={selected === b.id ? detail.data : undefined} type={type} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {b.meet_url ? <Action.OpenInBrowser title="Join" icon={Icon.Video} url={b.meet_url} /> : null}
                      {b.meet_url ? (
                        <Action.CopyToClipboard
                          title="Copy Join Link"
                          content={b.meet_url}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                      ) : null}
                      <Action.CopyToClipboard
                        title="Copy Guest Email"
                        content={b.guest_email}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                      />
                      {b.guest_phone ? (
                        <Action.CopyToClipboard title="Copy Guest Phone" content={b.guest_phone} />
                      ) : null}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser
                        title="Open in Gaurify Meet"
                        icon={MEET_ICON}
                        url={appUrl("bookings")}
                        shortcut={Keyboard.Shortcut.Common.Open}
                      />
                      <Action.OpenInBrowser
                        title="Reschedule"
                        icon={Icon.Calendar}
                        url={appUrl("bookings")}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                      />
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => setShowDetail((v) => !v)}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Cancel Meeting"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => cancel(b)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function Detail({ booking: b, extra, type }: { booking: Booking; extra?: BookingDetail; type: string }) {
  const answers = extra?.answers?.filter((a) => a.value.trim()) || [];
  const where =
    b.mode === "phone"
      ? "Phone call"
      : extra?.location === "google_meet"
        ? "Google Meet"
        : extra?.location === "link"
          ? "Your link"
          : "Video call";
  const md = [
    `## ${b.guest_name}`,
    `${longWhen(b.start_utc)} to ${time(b.end_utc)}`,
    b.note ? `### Note\n${b.note}` : "",
    answers.length ? `### Answers\n${answers.map((a) => `**${a.label}**\n\n${a.value}`).join("\n\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Type" text={type} />
          <List.Item.Detail.Metadata.Label title="Length" text={minutes(b.duration_min)} />
          <List.Item.Detail.Metadata.Label title="Where" text={where} icon={modeIcon(b).source} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link title="Email" text={b.guest_email} target={`mailto:${b.guest_email}`} />
          {b.guest_phone ? <List.Item.Detail.Metadata.Label title="Phone" text={b.guest_phone} /> : null}
          {extra?.guest_tz ? <List.Item.Detail.Metadata.Label title="Their time zone" text={extra.guest_tz} /> : null}
          {b.payment_status && b.amount ? (
            <List.Item.Detail.Metadata.Label title="Paid" text={money(b.amount, b.currency || "INR")} />
          ) : null}
          {b.meet_url ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="Join link" text={hostOf(b.meet_url)} target={b.meet_url} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
