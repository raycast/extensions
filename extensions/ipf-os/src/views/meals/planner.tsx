import {
  Alert,
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { mealsWebUrl } from "../../lib/config";
import { cancelMealSelection, getMealOptions } from "../../lib/api/meals";
import { readMealDraft, readMealDrafts, removeMealDraft, writeMealDraft } from "../../lib/meals/drafts";
import {
  DAYS,
  WEEKDAYS,
  addDays,
  choiceLabel,
  createDraft,
  currentMonday,
  dateLabel,
  draftIssues,
  eatTime,
  fingerprint,
  reviewMarkdown,
  weekLabel,
  windowLabel,
} from "../../lib/meals/planning";
import {
  MealConflictError,
  MealValidationError,
  fillMealDraft,
  loadMealPlanner,
  newPlannerDraft,
  submitMealDraft,
  type MealPlannerData,
} from "../../lib/meals/service";
import type { MealDraft } from "../../lib/meals/schemas";
import { refreshMealsStatus } from "../../lib/meals/status";
import { MealsError, mealAction } from "./common";
import { MealDayEditor } from "./day-editor";
import { MealPreferences } from "./preferences";

export function MealPlanner({ account, reviewOnOpen = false }: { account: string; reviewOnOpen?: boolean }) {
  const { push } = useNavigation();
  const { data, error, isLoading, revalidate } = useCachedPromise(loadMealPlanner, [account], {
    keepPreviousData: false,
  });
  const target = data?.nextWeekPlan;
  const stored = useCachedPromise(readMealDraft, [account, target?.id ?? ""], {
    execute: Boolean(target),
    keepPreviousData: false,
  });
  const allDrafts = useCachedPromise(readMealDrafts, [account], { keepPreviousData: false });
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [searchText, setSearchText] = useState("");
  const reviewOpened = useRef(false);
  const draft = stored.data ?? (data ? newPlannerDraft(data) : null);
  const persist = async (next: MealDraft) => {
    await stored.mutate(writeMealDraft(account, { ...next, updatedAt: new Date().toISOString() }), {
      optimisticUpdate: () => next,
    });
    allDrafts.revalidate();
  };
  const reset = async () => {
    if (target) await stored.mutate(removeMealDraft(account, target.id));
  };
  const refresh = () => {
    void refreshMealsStatus();
    revalidate();
    stored.revalidate();
    allDrafts.revalidate();
  };
  const focusDay = (day: number) => {
    setSearchText("");
    setSelectedId(String(day));
  };
  function review() {
    if (!data || !draft) return;
    push(
      <MealPlanReview
        account={account}
        draft={draft}
        data={data}
        onSaved={refresh}
        onConflict={refresh}
        onEditDay={focusDay}
      />,
    );
  }
  useEffect(() => {
    if (reviewOnOpen && !reviewOpened.current && data && draft && stored.data && !stored.isLoading) {
      reviewOpened.current = true;
      push(
        <MealPlanReview
          account={account}
          draft={draft}
          data={data}
          onSaved={refresh}
          onConflict={refresh}
          onEditDay={focusDay}
        />,
      );
    }
  }, [reviewOnOpen, data, draft, stored.isLoading, stored.data]);
  const retainedDrafts = allDrafts.data?.some((entry) => entry.planId !== target?.id) && (
    <List.Section title="Other Unsubmitted Drafts" subtitle="Kept for their original weeks">
      {(allDrafts.data ?? [])
        .filter((entry) => entry.planId !== target?.id)
        .map((entry) => (
          <List.Item
            key={entry.planId}
            title={weekLabel(entry.weekStart)}
            subtitle="Not the current planning target"
            icon={Icon.Clock}
            detail={
              <List.Item.Detail
                markdown={`# Draft for ${weekLabel(entry.weekStart)}\n\nSaved ${eatTime(entry.updatedAt)}.\n\nThis draft cannot be submitted while a different week is the planning target. It has not been moved or deleted.`}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Retained Draft"
                  target={<RetainedMealDraft account={account} draft={entry} onRemoved={refresh} />}
                />
              </ActionPanel>
            }
          />
        ))}
    </List.Section>
  );
  if (!data && error) return <MealsError error={error} onRetry={refresh} />;
  if (stored.error && !stored.data) return <MealsError error={stored.error} onRetry={refresh} />;
  if ((target && stored.isLoading && !stored.data) || !data)
    return <List isLoading searchText={searchText} onSearchTextChange={setSearchText} />;
  if (!draft || !target)
    return (
      <List isLoading={isLoading} isShowingDetail searchText={searchText} onSearchTextChange={setSearchText} filtering>
        <List.Item
          icon={Icon.Calendar}
          title="Planning menu is not available"
          detail={
            <List.Item.Detail markdown="Meals staff have not made a target menu available. Your existing drafts are retained for their original weeks." />
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
              <Action.OpenInBrowser title="Open Meals in IPF OS" url={mealsWebUrl()} />
            </ActionPanel>
          }
        />
        {retainedDrafts}
      </List>
    );
  const issues = draftIssues(draft, data.options, data.rules);
  const conflict = draft.baseline !== fingerprint(data.myNextSelection);
  const menuDays = DAYS.filter((day) => data.options.some((option) => option.day === day && option.role === "main"));
  const reviewed = menuDays.filter((day) => !issues.some((issue) => issue.day === day)).length;
  const quickFillAvailable = draft.weekStart === addDays(currentMonday(), 7);
  const hasUnsentChanges = Boolean(
    stored.data && JSON.stringify(stored.data.days) !== JSON.stringify(newPlannerDraft(data)?.days),
  );
  async function fill(source: "recent" | "popular") {
    if (!draft || busy) return;
    if (
      hasUnsentChanges &&
      !(await confirmAlert({
        title: "Replace the current draft?",
        message: "Quick-fill replaces your unsent choices. You will review the result before submitting.",
        primaryAction: { title: "Replace Draft" },
      }))
    )
      return;
    setBusy(true);
    await mealAction(
      "Preparing meal choices…",
      "Draft filled · review before submitting",
      async () => persist(await fillMealDraft(draft, source)),
      () => undefined,
    );
    setBusy(false);
  }
  const sharedActions = (
    <>
      <Action title="Review Plan" icon={Icon.Eye} shortcut={Keyboard.Shortcut.Common.Open} onAction={review} />
      {quickFillAvailable && (
        <ActionPanel.Section title="Fill Draft">
          <Action title="Use Recent Choices" icon={Icon.Clock} onAction={() => fill("recent")} />
          <Action title="Use Popular Choices" icon={Icon.Stars} onAction={() => fill("popular")} />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Draft">
        <Action
          title="Reset Draft"
          style={Action.Style.Destructive}
          icon={Icon.ArrowCounterClockwise}
          onAction={async () => {
            if (busy) return;
            if (
              hasUnsentChanges &&
              draft.days.some((day) => day.state !== "unselected") &&
              !(await confirmAlert({
                title: "Reset all draft choices?",
                message: "This clears unsent choices. Your submitted plan will stay saved.",
                primaryAction: { title: "Reset Draft", style: Alert.ActionStyle.Destructive },
              }))
            )
              return;
            await mealAction(
              "Resetting draft…",
              "Draft reset · saved plan unchanged",
              () =>
                persist({
                  ...createDraft(target, null),
                  baseline: fingerprint(data.myNextSelection),
                }),
              () => focusDay(1),
            );
          }}
        />
        {stored.data && (
          <Action
            title={data.myNextSelection ? "Use Saved Plan" : "Discard Draft"}
            style={Action.Style.Destructive}
            icon={Icon.ArrowCounterClockwise}
            onAction={async () => {
              if (
                !hasUnsentChanges ||
                (await confirmAlert({
                  title: "Discard unsent choices?",
                  message: data.myNextSelection
                    ? "Return to the saved plan. Your unsent choices will be discarded."
                    : "Your unsent choices will be discarded. No submitted plan will be changed.",
                  primaryAction: {
                    title: data.myNextSelection ? "Use Saved Plan" : "Discard Draft",
                    style: Alert.ActionStyle.Destructive,
                  },
                }))
              )
                await mealAction("Discarding draft…", "Draft discarded", reset, refresh);
            }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Saved Plan">
        <Action.Push
          title={data.windowStatus.userAvailable ? "Meal Preferences" : "Manage Availability"}
          icon={Icon.Gear}
          target={<MealPreferences profile={data.profile} onSaved={refresh} />}
        />
        {data.myNextSelection && data.windowStatus.canSubmit && (
          <Action
            title="Cancel Submitted Plan"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (busy) return;
              if (
                !(await confirmAlert({
                  title: `Cancel meals for ${weekLabel(draft.weekStart)}?`,
                  message:
                    `Saved days: ${data.myNextSelection?.items.map((day) => WEEKDAYS[day.day - 1]).join(", ") || "none"}. ` +
                    "The submitted plan will be canceled. Unsent draft choices will be kept. You can submit again only while the server permits it.",
                  primaryAction: { title: "Cancel Submitted Plan", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              setBusy(true);
              await mealAction(
                "Canceling plan…",
                "Submitted meal plan canceled",
                async () => {
                  await cancelMealSelection(draft.planId);
                },
                refresh,
              );
              setBusy(false);
            }}
          />
        )}
        <Action.OpenInBrowser title="Open Meals in IPF OS" url={mealsWebUrl()} />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={refresh}
        />
      </ActionPanel.Section>
    </>
  );
  return (
    <List
      isLoading={isLoading || stored.isLoading || busy}
      isShowingDetail
      searchBarPlaceholder="Find a weekday or meal"
      searchText={searchText}
      onSearchTextChange={(value) => {
        setSearchText(value);
        if (!value) setSelectedId(undefined);
      }}
      filtering
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? "")}
    >
      <List.EmptyView
        title="No matching weekdays or meals"
        description="Try a meal name or clear the search."
        actions={
          <ActionPanel>
            <Action title="Clear Search" onAction={() => setSearchText("")} />
          </ActionPanel>
        }
      />
      <List.Section
        title={
          stored.data
            ? "Unsubmitted Draft"
            : data.myNextSelection
              ? "Submitted Plan · edit a day to revise"
              : "New Plan"
        }
        subtitle={`${weekLabel(draft.weekStart)} · ${reviewed} of ${menuDays.length} menu days ready`}
      >
        {draft.days.map((choice) => {
          const issue = issues.find((issue) => issue.day === choice.day);
          const warning = draft.warnings.find((warning) => warning.day === choice.day);
          return (
            <List.Item
              key={choice.day}
              id={String(choice.day)}
              title={`${WEEKDAYS[choice.day - 1].slice(0, 3)} ${dateLabel(addDays(draft.weekStart, choice.day - 1))}`}
              subtitle={choiceLabel(choice, data.options)}
              keywords={[
                WEEKDAYS[choice.day - 1],
                choiceLabel(choice, data.options),
                ...data.options.filter((option) => option.day === choice.day).map((option) => option.name),
              ]}
              icon={{
                source:
                  issue || choice.state === "unselected"
                    ? Icon.Circle
                    : choice.state === "skipped"
                      ? Icon.MinusCircle
                      : Icon.CheckCircle,
                tintColor: issue ? Color.Orange : choice.state === "selected" ? Color.Green : Color.SecondaryText,
              }}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${WEEKDAYS[choice.day - 1]}`,
                    choiceLabel(choice, data.options),
                    choice.state === "selected"
                      ? "**Ready · draft choice**"
                      : choice.state === "skipped"
                        ? "**Reviewed · skipped**"
                        : "",
                    issue?.message ?? "",
                    warning?.message ?? "",
                    `**${windowLabel(data.windowStatus)}**`,
                    data.windowStatus.reason ?? "",
                    conflict ? "**The saved plan changed. Review both versions before submitting this draft.**" : "",
                    `Last checked ${eatTime(data.fetchedAt)}`,
                    error ? `**Could not refresh:** ${error.message}. Showing last known menu and eligibility.` : "",
                    stored.error ? `**Could not load the latest draft:** ${stored.error.message}` : "",
                    allDrafts.error ? `**Could not load retained drafts:** ${allDrafts.error.message}` : "",
                    !quickFillAvailable
                      ? "Quick-fill is unavailable for this special target week. Edit days individually."
                      : "",
                    "Draft only. Review the week before submitting.",
                  ]
                    .filter(Boolean)
                    .join("\n\n")}
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Day"
                    icon={Icon.Pencil}
                    target={
                      <MealDayEditor
                        choice={choice}
                        options={data.options}
                        rules={data.rules}
                        onApply={(next) =>
                          persist({
                            ...draft,
                            days: draft.days.map((day) => (day.day === next.day ? next : day)),
                            warnings: draft.warnings.filter((warning) => warning.day !== next.day),
                          })
                        }
                      />
                    }
                  />
                  {sharedActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Review and Submit">
        <List.Item
          title="Review Week"
          subtitle={issues.length ? `${issues.length} day(s) need attention` : "Check choices and skipped days"}
          icon={Icon.Eye}
          detail={<List.Item.Detail markdown={reviewMarkdown(draft, data.options, data.myNextSelection)} />}
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      </List.Section>
      {retainedDrafts}
    </List>
  );
}

function MealPlanReview({
  account,
  draft,
  data: initialData,
  onSaved,
  onConflict,
  onEditDay,
}: {
  account: string;
  draft: MealDraft;
  data: MealPlannerData;
  onSaved: () => void;
  onConflict: () => void;
  onEditDay: (day: number) => void;
}) {
  const { pop } = useNavigation();
  const { data, error, isLoading, revalidate } = useCachedPromise(loadMealPlanner, [account], {
    initialData,
    keepPreviousData: false,
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  const [conflict, setConflict] = useState<MealConflictError>();
  const sameTarget = data.nextWeekPlan?.id === draft.planId;
  const issues = sameTarget ? draftIssues(draft, data.options, data.rules) : [];
  const changed = sameTarget && draft.baseline !== fingerprint(data.myNextSelection);
  const canSubmit =
    sameTarget && !isLoading && !error && data.windowStatus.canSubmit && !issues.length && !changed && !conflict;
  const saved = sameTarget ? (conflict ? conflict.saved : data.myNextSelection) : null;
  async function submit() {
    if (busy) return;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Submitting meals…" });
    try {
      const result = await submitMealDraft(draft);
      await removeMealDraft(account, draft.planId);
      toast.style = Toast.Style.Success;
      toast.title = `Meals submitted for ${weekLabel(draft.weekStart)}`;
      toast.message = `Saved ${eatTime(result.submitted_at)}`;
      onSaved();
      void launchCommand({
        name: "confetti",
        extensionName: "raycast",
        ownerOrAuthorName: "raycast",
        type: LaunchType.UserInitiated,
      }).catch(() => undefined);
      pop();
    } catch (error) {
      if (error instanceof MealConflictError) {
        setConflict(error);
        onConflict();
      }
      if (error instanceof MealValidationError && error.issues[0]) {
        onEditDay(error.issues[0].day);
        onConflict();
        pop();
      }
      const message = error instanceof Error ? error.message : "Could not submit meals";
      setFailure(message);
      revalidate();
      toast.style = Toast.Style.Failure;
      toast.title = "Plan was not confirmed";
      toast.message = message;
    } finally {
      setBusy(false);
    }
  }
  const prior = saved
    ? saved.items
        .map((day) => `- **${WEEKDAYS[day.day - 1]}:** ${[day.main_name, day.side_name].filter(Boolean).join(" · ")}`)
        .join("\n") || "All days skipped"
    : "No saved selection";
  return (
    <Detail
      isLoading={busy || isLoading}
      navigationTitle={`Review Meals · ${weekLabel(draft.weekStart)}`}
      markdown={[
        reviewMarkdown(draft, data.options, saved),
        `**${windowLabel(data.windowStatus)}**`,
        data.windowStatus.reason ?? "",
        !sameTarget
          ? "**The planning target changed.** Your original draft is safe. Return to the week overview to open the current target."
          : "",
        error
          ? `**Could not refresh eligibility:** ${error.message}. Refresh successfully before submitting.`
          : `Last checked ${eatTime(data.fetchedAt)}`,
        issues.length
          ? "## Needs Attention\n" + issues.map((issue) => `- ${WEEKDAYS[issue.day - 1]}: ${issue.message}`).join("\n")
          : "",
        saved ? `## Current Saved Plan\n${prior}\n\nSaved ${eatTime(saved.submitted_at)}` : "Current saved plan: none.",
        changed || conflict
          ? "Your draft was based on an older selection. Review the saved changes before choosing to keep the draft."
          : "",
        failure ? `## Submission Status\n${failure}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")}
      actions={
        <ActionPanel>
          {canSubmit && (
            <Action
              title={data.myNextSelection ? "Update Submitted Plan" : "Submit Plan"}
              icon={Icon.CheckCircle}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={submit}
            />
          )}
          {sameTarget && !isLoading && !error && (changed || conflict) && (
            <Action
              title="Keep Draft After Reviewing Saved Changes"
              icon={Icon.Pencil}
              onAction={async () => {
                await writeMealDraft(account, {
                  ...draft,
                  baseline: fingerprint(saved),
                  updatedAt: new Date().toISOString(),
                });
                onConflict();
                pop();
              }}
            />
          )}
          {issues[0] && (
            <Action
              title={`Fix ${WEEKDAYS[issues[0].day - 1]}`}
              icon={Icon.Pencil}
              onAction={() => {
                onEditDay(issues[0].day);
                pop();
              }}
            />
          )}
          <Action
            title="Refresh Eligibility"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              setConflict(undefined);
              setFailure(undefined);
              revalidate();
            }}
          />
          <Action title="Back to Week" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

async function loadDraftMenu(_account: string, planId: string) {
  return getMealOptions(planId);
}

function RetainedMealDraft({
  account,
  draft,
  onRemoved,
}: {
  account: string;
  draft: MealDraft;
  onRemoved: () => void;
}) {
  const { pop } = useNavigation();
  const { data, error, isLoading, revalidate } = useCachedPromise(loadDraftMenu, [account, draft.planId], {
    keepPreviousData: false,
  });
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Retained Draft · ${weekLabel(draft.weekStart)}`}
      markdown={[
        data ? reviewMarkdown(draft, data, null) : `# Draft for ${weekLabel(draft.weekStart)}`,
        `Saved ${eatTime(draft.updatedAt)}. This is not the current planning target and cannot be submitted here.`,
        error ? `Could not load this week's menu: ${error.message}. Your draft is still retained.` : "",
      ]
        .filter(Boolean)
        .join("\n\n")}
      actions={
        <ActionPanel>
          <Action title="Back to Week" icon={Icon.ArrowLeft} onAction={pop} />
          <Action
            title="Discard Retained Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                !(await confirmAlert({
                  title: `Discard draft for ${weekLabel(draft.weekStart)}?`,
                  message: "Only these unsent choices will be removed. No submitted plan will be changed.",
                  primaryAction: { title: "Discard Draft", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              await mealAction(
                "Discarding draft…",
                "Retained draft discarded",
                () => removeMealDraft(account, draft.planId),
                () => {
                  onRemoved();
                  pop();
                },
              );
            }}
          />
          <Action title="Refresh Menu" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
