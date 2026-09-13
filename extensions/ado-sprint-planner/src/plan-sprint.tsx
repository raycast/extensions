/* eslint-disable @raycast/prefer-title-case -- action titles intentionally keep acronyms/product terms uppercase (ID, ADO, AI) */
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { clearAdoCache, getCurrentIteration, getPlannerItems } from "./lib/ado";
import { aiOrderItems } from "./lib/ai-plan";
import {
  orderItems,
  projectPlan,
  reconcileOrder,
  remainingWorkingDays,
} from "./lib/plan";
import { getPlan, savePlan, setDeferred } from "./lib/storage";
import { statusColor } from "./lib/status";
import { StatusSubmenu } from "./lib/status-actions";
import { useLocalLayer } from "./lib/use-local-layer";
import { typeIcon, workItemAccessories } from "./lib/ui";
import { Preferences, WorkItem } from "./lib/types";

function prettyDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function PlanSprint() {
  const prefs = getPreferenceValues<Preferences>();
  const capacity = parseInt(prefs.dailyCapacity || "3", 10) || 3;
  const geminiApiKey = prefs.geminiApiKey;
  const includeBacklog = prefs.includeBacklog !== false;

  const { statusOf, deferred, revalidateLocal } = useLocalLayer();
  const [orderOverride, setOrderOverride] = useState<number[] | null>(null);
  const [replanning, setReplanning] = useState(false);

  const { data, isLoading, revalidate } = useCachedPromise(
    async (backlog: boolean) => {
      const [iteration, items, plan] = await Promise.all([
        getCurrentIteration(),
        getPlannerItems(backlog),
        getPlan(),
      ]);
      return { iteration, items, plan };
    },
    [includeBacklog],
    { keepPreviousData: true },
  );

  const items = data?.items ?? [];
  const byId = new Map<number, WorkItem>(items.map((i) => [i.id, i]));
  const openItems = items.filter(
    (i) => !deferred.has(i.id) && statusOf(i.id) !== "done",
  );

  // Default rank; openSorted is what projectPlan appends leftovers from.
  const defaultOrder = orderItems(openItems, statusOf);
  const openSorted = defaultOrder
    .map((id) => byId.get(id))
    .filter((x): x is WorkItem => Boolean(x));

  const effectiveOrder = orderOverride ?? data?.plan?.order ?? defaultOrder;
  const days = data
    ? remainingWorkingDays(data.iteration.startDate, data.iteration.finishDate)
    : [];
  const projection = projectPlan(effectiveOrder, openSorted, days, capacity);

  const currentSequence = () =>
    [...projection.perDay.flatMap((d) => d.items), ...projection.overflow].map(
      (i) => i.id,
    );

  async function save() {
    if (!data) return;
    await savePlan({
      iterationId: data.iteration.id,
      generatedAt: new Date().toISOString(),
      order: currentSequence(),
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Plan saved",
      message: projection.fits
        ? `${projection.load} item(s) fit`
        : `${projection.overflow.length} item(s) at risk`,
    });
  }

  function replanSmart() {
    setOrderOverride(defaultOrder);
    showToast({ style: Toast.Style.Success, title: "Re-sequenced (Smart)" });
  }

  async function replanAI() {
    if (!geminiApiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Gemini API key",
        message: "Add one in preferences to use Auto (AI) sequencing.",
      });
      return;
    }
    setReplanning(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Sequencing with AI…",
      });
      const aiIds = await aiOrderItems(openSorted, geminiApiKey);
      setOrderOverride(reconcileOrder(aiIds, defaultOrder));
      await showToast({
        style: Toast.Style.Success,
        title: "Re-sequenced with AI",
        message: "Review, then Save Plan to keep it.",
      });
    } catch (e) {
      setOrderOverride(defaultOrder);
      await showToast({
        style: Toast.Style.Failure,
        title: "AI re-plan failed — used Smart order",
        message: String(e),
      });
    } finally {
      setReplanning(false);
    }
  }

  function bumpToFront(item: WorkItem) {
    const seq = currentSequence();
    setOrderOverride([item.id, ...seq.filter((x) => x !== item.id)]);
  }

  async function defer(item: WorkItem) {
    await setDeferred(item.id, true);
    await revalidateLocal();
    await showToast({
      style: Toast.Style.Success,
      title: `#${item.id} deferred`,
    });
  }

  function row(item: WorkItem) {
    const status = statusOf(item.id);
    return (
      <List.Item
        key={item.id}
        icon={{ source: typeIcon(item.type), tintColor: statusColor(status) }}
        title={item.title}
        subtitle={`#${item.id}`}
        accessories={[
          ...(item.inSprint === false
            ? [{ tag: { value: "Backlog", color: Color.Orange } }]
            : []),
          ...workItemAccessories(item, status),
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={item.url} />
            <Action
              title="Save Plan"
              icon={Icon.SaveDocument}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={save}
            />
            <StatusSubmenu
              id={item.id}
              current={status}
              onChange={revalidateLocal}
            />
            <Action
              title="Do Next (Bump to Front)"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => bumpToFront(item)}
            />
            <Action
              title="Defer"
              icon={Icon.EyeDisabled}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => defer(item)}
            />
            <Action
              title="Re-Plan (Smart)"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={replanSmart}
            />
            <Action
              title="Re-Plan with AI"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={replanAI}
            />
            <Action
              title="Refresh from ADO"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                await clearAdoCache();
                revalidate();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const fitText = projection.fits
    ? `✅ fits${projection.bufferDays > 0 ? ` · ${projection.bufferDays}d buffer` : ""}`
    : `⚠️ ${projection.overflow.length} at risk`;

  return (
    <List
      isLoading={isLoading || replanning}
      navigationTitle={
        data
          ? `Plan — ${data.iteration.name} · ${days.length}d left · ${projection.load} to do · ${fitText}`
          : "Plan Sprint"
      }
      searchBarPlaceholder="Preview and sequence your sprint"
    >
      {projection.perDay.map((bucket, i) => {
        if (bucket.items.length === 0) return null;
        return (
          <List.Section
            key={bucket.day}
            title={
              i === 0
                ? `Today · ${prettyDay(bucket.day)}`
                : prettyDay(bucket.day)
            }
            subtitle={`${bucket.items.length} item(s)`}
          >
            {bucket.items.map(row)}
          </List.Section>
        );
      })}
      {projection.overflow.length > 0 && (
        <List.Section
          title="At Risk of Spillover"
          subtitle={`${projection.overflow.length} won't fit — defer, or raise Daily Capacity`}
        >
          {projection.overflow.map(row)}
        </List.Section>
      )}
      {!isLoading && data && projection.load === 0 && (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="Nothing left to plan"
          description="All your sprint items are done or deferred."
        />
      )}
    </List>
  );
}
