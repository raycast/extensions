import { List } from "@raycast/api";
import { formatStats, isGroupReportItem } from "../helpers/report";
import { MakeNullable } from "../types";
import ReportListItem from "./ReportListItem";

interface ReportListParams
  extends Omit<MakeNullable<Parameters<typeof ReportListItem>[0], "reportItem">, "totalBlockedDuration"> {
  reportingPeriodDropdown?: JSX.Element;
}

export default function ReportList({
  reportItem,
  tieredTodoGroups,
  todoTags,
  isLoading,
  isSingleDayReport,
  reportingPeriodDropdown,
  groupKeys,
  availableGroupKeys,
  setGroupKeys,
  showingGroupsAsItems,
  setShowingGroupsAsItems,
  sortDescriptor,
  setSortDescriptor,
  showSourceIcon,
  refresh,
}: ReportListParams): JSX.Element {
  return (
    <List
      isLoading={isLoading}
      navigationTitle={reportItem ? reportItem.title + " :: " + formatStats(reportItem) : undefined}
      searchBarAccessory={reportingPeriodDropdown}
    >
      {reportItem && isGroupReportItem(reportItem)
        ? reportItem.children?.map((child) =>
            isGroupReportItem(child) && !showingGroupsAsItems ? (
              <List.Section key={child.id} title={child.title} subtitle={formatStats(child)}>
                {child.children?.map((grandchild) => (
                  <ReportListItem
                    key={grandchild.id}
                    reportItem={grandchild}
                    tieredTodoGroups={tieredTodoGroups}
                    todoTags={todoTags}
                    totalBlockedDuration={reportItem.blockedDuration}
                    isLoading={isLoading}
                    isSingleDayReport={isSingleDayReport}
                    groupKeys={groupKeys}
                    availableGroupKeys={availableGroupKeys}
                    setGroupKeys={setGroupKeys}
                    showingGroupsAsItems={showingGroupsAsItems}
                    setShowingGroupsAsItems={setShowingGroupsAsItems}
                    sortDescriptor={sortDescriptor}
                    setSortDescriptor={setSortDescriptor}
                    showSourceIcon={showSourceIcon}
                    refresh={refresh}
                  />
                ))}
              </List.Section>
            ) : (
              <ReportListItem
                key={child.id}
                reportItem={child}
                tieredTodoGroups={tieredTodoGroups}
                todoTags={todoTags}
                totalBlockedDuration={reportItem.blockedDuration}
                isLoading={isLoading}
                isSingleDayReport={isSingleDayReport}
                groupKeys={groupKeys}
                availableGroupKeys={availableGroupKeys}
                setGroupKeys={setGroupKeys}
                showingGroupsAsItems={showingGroupsAsItems}
                setShowingGroupsAsItems={setShowingGroupsAsItems}
                sortDescriptor={sortDescriptor}
                setSortDescriptor={setSortDescriptor}
                showSourceIcon={showSourceIcon}
                refresh={refresh}
              />
            )
          )
        : null}
    </List>
  );
}
