import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  environment,
  LocalStorage,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { fetchMySubmissions, DEMO_FLAG } from "./lib/openreview";
import { SubmissionDetail } from "./components/SubmissionDetail";
import { STATUS_COLOR } from "./status";
import { Submission } from "./types";

// Per-submission list of review ids the user has already seen, so a new review
// lights up a 💡 indicator (and a NEW badge in the detail) until they open it.
type SeenMap = Record<string, string[]>;

const FILTERS: { id: string; title: string }[] = [
  { id: "all", title: "All Statuses" },
  { id: "Under Review", title: "Under Review" },
  { id: "Reviewed", title: "Reviewed" },
  { id: "Accepted", title: "Accepted" },
  { id: "Rejected", title: "Rejected" },
  { id: "Withdrawn", title: "Withdrawn" },
  { id: "Desk Rejected", title: "Desk Rejected" },
];

export default function Command() {
  const [filter, setFilter] = useState("all");
  const { value: seen, setValue: setSeen } = useLocalStorage<SeenMap>(
    "seen-reviews",
    {},
  );
  const { data, isLoading, error, revalidate } = useCachedPromise(
    fetchMySubmissions,
    [],
    {
      keepPreviousData: true,
    },
  );

  const seenMap = seen ?? {};
  // Defensive: older builds stored a count, not an array — treat as unseen.
  const seenIdsOf = (id: string): string[] =>
    Array.isArray(seenMap[id]) ? seenMap[id] : [];
  const newReviewIds = (s: Submission): string[] => {
    const seenIds = seenIdsOf(s.id);
    return s.reviews.filter((r) => !seenIds.includes(r.id)).map((r) => r.id);
  };
  const markSeen = (s: Submission) =>
    setSeen({ ...seenMap, [s.id]: s.reviews.map((r) => r.id) });

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load submissions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const submissions = (data ?? []).filter(
    (s) => filter === "all" || s.status === filter,
  );
  const markAllSeen = () =>
    setSeen(
      Object.fromEntries(
        submissions.map((s) => [s.id, s.reviews.map((r) => r.id)]),
      ),
    );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter submissions by title…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          value={filter}
          onChange={setFilter}
        >
          {FILTERS.map((f) => (
            <List.Dropdown.Item key={f.id} title={f.title} value={f.id} />
          ))}
        </List.Dropdown>
      }
    >
      {submissions.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Document} title="No submissions found" />
      ) : null}
      {submissions.map((s) => {
        const newIds = newReviewIds(s);
        return (
          <List.Item
            key={s.id}
            icon={Icon.Document}
            title={s.title}
            subtitle={s.venueShort}
            keywords={[s.venueShort, s.status, String(s.number)]}
            accessories={[
              ...(newIds.length > 0
                ? [
                    {
                      icon: { source: Icon.LightBulb, tintColor: Color.Yellow },
                      tooltip: `${newIds.length} new review${newIds.length === 1 ? "" : "s"} since you last looked`,
                    },
                  ]
                : []),
              ...(s.ratingAgg
                ? [
                    {
                      tag: {
                        value: s.ratingAgg.avg.toFixed(2),
                        color: Color.Yellow,
                      },
                      tooltip: `Avg ${s.ratingLabel} (min ${s.ratingAgg.min}, max ${s.ratingAgg.max}) · ${s.reviews.length} reviews`,
                    },
                  ]
                : []),
              { tag: { value: s.status, color: STATUS_COLOR[s.status] } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  icon={Icon.Eye}
                  target={<SubmissionDetail s={s} newReviewIds={newIds} />}
                  onPush={() => markSeen(s)}
                />
                <Action.OpenInBrowser title="Open Forum" url={s.forumUrl} />
                {s.pdfUrl ? (
                  <Action.OpenInBrowser title="Open Pdf" url={s.pdfUrl} />
                ) : null}
                {newIds.length > 0 ? (
                  <Action
                    title="Mark as Seen"
                    icon={Icon.Checkmark}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                    onAction={() => markSeen(s)}
                  />
                ) : null}
                <Action
                  title="Mark All as Seen"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  onAction={markAllSeen}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => {
                    revalidate();
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Refreshing…",
                    });
                  }}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
                {environment.isDevelopment ? (
                  <Action
                    title="Toggle Demo Data"
                    icon={Icon.Wand}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    onAction={async () => {
                      const on = await LocalStorage.getItem(DEMO_FLAG);
                      if (on) await LocalStorage.removeItem(DEMO_FLAG);
                      else await LocalStorage.setItem(DEMO_FLAG, "1");
                      revalidate();
                      showToast({
                        style: Toast.Style.Success,
                        title: on ? "Demo data off" : "Demo data on",
                      });
                    }}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
