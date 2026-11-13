import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  DataStateNotice,
  ReloadDataAction,
} from "./components/DataStateNotice";
import { SharedAppListItem } from "./components/SharedAppListItem";
import { TaggedApps } from "./browse-by-tag";
import {
  filterReviewApps,
  REVIEW_CATEGORY_LABELS,
  ReviewCategory,
  ReviewScope,
} from "./utils/review-filter";
import { countLabel } from "./utils/display-format";
import { useVessloData } from "./utils/useVessloData";

export default function ReviewApps() {
  const { data, isLoading, state, refresh } = useVessloData();
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<ReviewCategory>("all");
  const [scope, setScope] = useState<ReviewScope>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const reviewApps = useMemo(() => filterReviewApps(data?.apps ?? []), [data]);
  const visibleApps = useMemo(
    () => filterReviewApps(reviewApps, { category, query: searchText, scope }),
    [reviewApps, category, searchText, scope],
  );
  const scopeActions = (
    <>
      <Action
        title={
          scope === "all" ? "Show Update Candidates Only" : "Show All Apps"
        }
        icon={Icon.Filter}
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        onAction={() =>
          setScope((value) => (value === "all" ? "updates" : "all"))
        }
      />
      <Action
        title="Clear Review Filters"
        icon={Icon.ArrowCounterClockwise}
        onAction={() => {
          setSearchText("");
          setCategory("all");
          setScope("all");
        }}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && visibleApps.length > 0}
      navigationTitle={`Review Apps · ${scope === "all" ? "All Apps" : "Update Candidates"}`}
      searchBarPlaceholder="Search app reviews by name, Bundle ID, or review reason..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Review Category"
          value={category}
          onChange={(value) => setCategory(value as ReviewCategory)}
        >
          {Object.entries(REVIEW_CATEGORY_LABELS).map(([value, title]) => (
            <List.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </List.Dropdown>
      }
    >
      <DataStateNotice state={state} refresh={refresh} />
      {state.status === "ready" && visibleApps.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            reviewApps.length === 0
              ? "No Active Review Items"
              : "No Matching Review Items"
          }
          description={
            reviewApps.length === 0
              ? "The current Vesslo export contains no active app review items."
              : "Try another search term, review category, or app scope."
          }
          actions={
            <ActionPanel>
              {scopeActions}
              <ReloadDataAction refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
      {visibleApps.length > 0 && (
        <List.Section
          title={`${REVIEW_CATEGORY_LABELS[category]} · ${countLabel(visibleApps.length)}`}
          subtitle={
            scope === "all"
              ? "All Apps · ⌘⇧U for Update Candidates"
              : "Update Candidates · ⌘⇧U for All Apps"
          }
        >
          {visibleApps.map((app) => (
            <SharedAppListItem
              key={app.id}
              app={app}
              state={state}
              showReviewDetails
              reviewOnly
              onRefresh={refresh}
              tagNavigation={(tag) => <TaggedApps tag={tag} />}
              extraActions={
                <>
                  {scopeActions}
                  <Action
                    title={
                      isShowingDetail
                        ? "Hide Review Details"
                        : "Show Review Details"
                    }
                    icon={isShowingDetail ? Icon.EyeDisabled : Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                    onAction={() => setIsShowingDetail((value) => !value)}
                  />
                </>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
