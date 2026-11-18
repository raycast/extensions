import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { VessloApp, VessloData } from "./types";
import { useVessloData } from "./utils/useVessloData";
import {
  homebrewSelectionDriftReason,
  resolveAppActions,
  resolveBulkAction,
} from "./utils/action-policy";
import { openInVesslo } from "./utils/actions";
import { countLabel, displayText } from "./utils/display-format";
import { searchApps } from "./utils/search-filter";
import { SharedAppListItem } from "./components/SharedAppListItem";
import {
  DataStateNotice,
  ReloadDataAction,
} from "./components/DataStateNotice";
import { HomebrewRequestReview } from "./components/HomebrewRequestReview";
import { TaggedApps } from "./browse-by-tag";
import HandoffRequests from "./handoff-requests";

type Selection = { data: VessloData; apps: VessloApp[] };
export default function BulkHomebrewUpdate() {
  const { data, isLoading, state, refresh } = useVessloData();
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const bulk = resolveBulkAction(data?.apps ?? [], state);
  const visible = useMemo(
    () => searchApps(bulk.candidates, searchText).map((result) => result.app),
    [data, searchText],
  );
  const selected = selection?.apps ?? [];
  const selectionChanged = selection
    ? data
      ? homebrewSelectionDriftReason(
          selection.data,
          data,
          selected,
          state.pathAvailability,
        )
      : "The current Vesslo export is unavailable. Reload before reviewing."
    : null;
  const hasReviewableTargets =
    bulk.canSelect &&
    !selectionChanged &&
    (selected.length > 0 ||
      visible.some(
        (app) => resolveAppActions(app, state).update.kind === "homebrewReview",
      ));
  const toggle = (app: VessloApp) => {
    setSelectionError(null);
    if (selected.some((item) => item.id === app.id)) {
      const remaining = selected.filter((item) => item.id !== app.id);
      setSelection(
        remaining.length && selection
          ? { ...selection, apps: remaining }
          : null,
      );
    } else if (selectionChanged) {
      setSelectionError(selectionChanged);
    } else if (selected.length >= 16) {
      setSelectionError("One review request can contain at most 16 apps.");
    } else if (
      data &&
      resolveAppActions(app, state).update.kind === "homebrewReview"
    ) {
      setSelection({ data: selection?.data ?? data, apps: [...selected, app] });
    }
  };
  const reviewText = [
    "Homebrew candidates exported by Vesslo — review list only",
    ...visible.map(
      (app) =>
        `${displayText(app.name)} | ${displayText(app.version)} → ${displayText(app.targetVersion)} | cask: ${displayText(app.homebrewCask)} | Bundle ID: ${displayText(app.bundleId)} | path: ${displayText(app.path)}`,
    ),
  ].join("\n");
  const reviewActions = (
    <>
      {selection &&
        !selectionChanged &&
        bulk.canSelect &&
        selected.length > 0 && (
          <Action.Push
            title={`Review ${countLabel(selected.length)} in Vesslo`}
            icon={Icon.CheckList}
            target={
              <HomebrewRequestReview data={selection.data} apps={selected} />
            }
          />
        )}
      {bulk.canSelect &&
        visible.length > 0 &&
        visible.length <= 16 &&
        visible.every(
          (app) =>
            resolveAppActions(app, state).update.kind === "homebrewReview",
        ) && (
          <Action
            title="Select Matching Apps"
            icon={Icon.CheckCircle}
            onAction={() => {
              if (data) {
                setSelection({ data, apps: [...visible] });
                setSelectionError(null);
              }
            }}
          />
        )}
      {selection && (
        <Action
          title="Clear Selection"
          icon={Icon.XMarkCircle}
          onAction={() => {
            setSelection(null);
            setSelectionError(null);
          }}
        />
      )}
      <Action.Push
        title="View Homebrew Requests"
        icon={Icon.List}
        target={<HandoffRequests />}
      />
      <Action
        title="Open Vesslo"
        icon={Icon.AppWindow}
        onAction={() => openInVesslo()}
      />
      {visible.length > 0 && (
        <Action.CopyToClipboard
          title="Copy Matching Review List"
          content={reviewText}
        />
      )}
      <Action
        title={isShowingDetail ? "Hide Update Details" : "Show Update Details"}
        icon={isShowingDetail ? Icon.EyeDisabled : Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => setIsShowingDetail((value) => !value)}
      />
    </>
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Homebrew candidates…"
    >
      <DataStateNotice state={state} refresh={refresh} />
      <List.Section title="Homebrew Review">
        <List.Item
          id="vesslo-homebrew-review"
          icon={Icon.CheckList}
          title={`${selected.length} selected`}
          subtitle={displayText(
            selectionError ??
              (selectionChanged ? selectionChanged : "Select up to 16 apps"),
          )}
          accessories={[
            {
              text: hasReviewableTargets ? "Review in Vesslo" : "Review only",
              icon: {
                source: hasReviewableTargets ? Icon.CheckList : Icon.Info,
                tintColor: hasReviewableTargets
                  ? Color.SecondaryText
                  : Color.Orange,
              },
              tooltip:
                selectionError ??
                selectionChanged ??
                bulk.reason ??
                "Vesslo asks for confirmation before updating.",
            },
          ]}
          detail={
            <List.Item.Detail markdown="Select up to 16 exact Homebrew targets, then review your selection. Vesslo asks for confirmation before updating.\n\nSearch filters do not change your selection. Sending rechecks the current export and every selected identity. Changed targets must be selected again.\n\nURL opening is not acceptance or completion. View Homebrew Requests shows the app’s authoritative receipts." />
          }
          actions={
            <ActionPanel>
              {reviewActions}
              <ReloadDataAction refresh={refresh} />
            </ActionPanel>
          }
        />
      </List.Section>
      {visible.length > 0 ? (
        <List.Section
          title="Homebrew candidates"
          subtitle={
            visible.length === bulk.candidates.length
              ? countLabel(visible.length)
              : `${visible.length} of ${countLabel(bulk.candidates.length)}`
          }
        >
          {visible.map((app) => {
            const isSelected = selected.some((item) => item.id === app.id);
            const selectable =
              resolveAppActions(app, state).update.kind === "homebrewReview";
            return (
              <SharedAppListItem
                key={app.id}
                app={app}
                state={state}
                showUpdateDetails
                presentation="homebrew"
                onRefresh={refresh}
                selectedForReview={isSelected}
                leadingActions={
                  isSelected || selectable ? (
                    <Action
                      title={
                        isSelected
                          ? "Remove from Selection"
                          : "Select for Review"
                      }
                      icon={isSelected ? Icon.MinusCircle : Icon.PlusCircle}
                      onAction={() => toggle(app)}
                    />
                  ) : undefined
                }
                tagNavigation={(tag) => <TaggedApps tag={tag} />}
                extraActions={reviewActions}
              />
            );
          })}
        </List.Section>
      ) : (
        <List.Item
          id="vesslo-homebrew-empty"
          icon={Icon.MagnifyingGlass}
          title={
            searchText
              ? "No Matching Homebrew Candidates"
              : "No Homebrew Candidates in This Export"
          }
          actions={
            <ActionPanel>
              {reviewActions}
              <ReloadDataAction refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
