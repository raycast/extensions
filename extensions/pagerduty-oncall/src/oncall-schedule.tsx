/**
 * PagerDuty On-Call Schedule Component
 * Optimized with modern ES6 features and comprehensive utility functions
 */

import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { PagerDutyAPI } from "./api";
import { OnCallScheduleEntry } from "./types";
import {
  calculateDuration,
  categorizeSchedule,
  createUniqueKey,
  FILTER_CONFIG,
  filterSchedules,
  FilterType,
  formatAccessoryDate,
  formatDateRange,
  getScheduleName,
  groupSchedulesByMonth,
  searchSchedules,
  sortMonthsChronologically,
} from "./utils";

/**
 * Main component for displaying PagerDuty on-call schedules
 * Features: Smart filtering, search by date/type, modern ES6 patterns
 */
export default function OnCallSchedule() {
  const api = new PagerDutyAPI();
  const [filterType, setFilterType] = useState<FilterType>("recent_and_upcoming");
  const [searchText, setSearchText] = useState<string>("");

  // Fetch and categorize all schedule data
  const { data, isLoading, error } = usePromise(async () => {
    const [currentStatus, allSchedules] = await Promise.all([
      api.getCurrentOnCallStatus(),
      api.getAllOnCallSchedules(),
    ]);

    const now = new Date();

    return {
      current: currentStatus.schedules,
      all: allSchedules,
      upcoming: allSchedules.filter((schedule: OnCallScheduleEntry) => schedule.start > now),
      past: allSchedules.filter((schedule: OnCallScheduleEntry) => schedule.end < now),
    };
  });

  // Process schedules with filtering and search
  const processedSchedules = useMemo(() => {
    if (!data) return null;

    // Apply filter first
    const filteredByType = filterSchedules(data, filterType);

    // Then apply search
    const searchFiltered = searchSchedules(filteredByType, searchText);

    // Group by month and sort
    const grouped = groupSchedulesByMonth(searchFiltered);
    const sortedMonths = sortMonthsChronologically(grouped);

    return { grouped, sortedMonths, total: searchFiltered.length };
  }, [data, filterType, searchText]);

  // Error state with user-friendly message
  if (error) {
    return (
      <List searchBarPlaceholder="Error loading schedules">
        <List.Item
          title="Error Loading PagerDuty Schedules"
          subtitle={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Pagerduty" url="https://app.pagerduty.com" />
              <Action title="Update Api Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Loading state
  if (isLoading || !processedSchedules) {
    return <List isLoading searchBarPlaceholder="Loading your on-call schedules..." />;
  }

  const { grouped, sortedMonths, total } = processedSchedules;

  return (
    <List
      searchBarPlaceholder={`Search ${total} schedules by date, name, or status`}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Time Period"
          onChange={(value) => setFilterType(value as FilterType)}
          value={filterType}
        >
          {Object.entries(FILTER_CONFIG).map(([key, config]) => (
            <List.Dropdown.Item key={key} title={config.title} value={key} />
          ))}
        </List.Dropdown>
      }
    >
      {sortedMonths.length === 0 ? (
        <EmptyState filterType={filterType} searchText={searchText} />
      ) : (
        sortedMonths.map((monthYear) => (
          <MonthSection key={monthYear} monthYear={monthYear} schedules={grouped[monthYear]} />
        ))
      )}
    </List>
  );
}

/**
 * Component for displaying schedules within a month section
 */
function MonthSection({ monthYear, schedules }: { monthYear: string; schedules: OnCallScheduleEntry[] }) {
  const now = new Date();

  return (
    <List.Section title={monthYear}>
      {schedules.map((schedule, index) => {
        const { isPast, isActive } = categorizeSchedule(schedule, now);
        const name = getScheduleName(schedule);
        const dateRange = formatDateRange(schedule);
        const duration = calculateDuration(schedule.start, schedule.end);
        const accessoryDate = formatAccessoryDate(schedule.start);
        const url = schedule?.schedule?.html_url || "https://app.pagerduty.com";
        const uniqueKey = createUniqueKey(schedule, monthYear, index);

        return (
          <List.Item
            key={uniqueKey}
            title={dateRange}
            subtitle={isPast ? `✓ ${name}` : name}
            icon={getScheduleIcon(isPast, isActive)}
            accessories={[
              {
                text: `${duration} • ${accessoryDate}`,
                tooltip: `${schedule.start.getFullYear()}, ${dateRange} (Duration: ${duration})`,
              },
              {
                icon: Icon.ArrowNe,
                tooltip: "Open in PagerDuty",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Schedule in Pagerduty" url={url} icon={Icon.ArrowNe} />
                <Action.CopyToClipboard
                  title="Copy Schedule Details"
                  content={`${name}: ${dateRange} (${duration})`}
                  icon={Icon.Clipboard}
                />
                <Action.OpenInBrowser
                  title="Open Pagerduty Dashboard"
                  url="https://app.pagerduty.com"
                  icon={Icon.Globe}
                />
                <Action title="Update Api Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}

/**
 * Empty state component with contextual messaging
 */
function EmptyState({ filterType, searchText }: { filterType: FilterType; searchText: string }) {
  const config = FILTER_CONFIG[filterType];
  const isSearching = searchText.trim().length > 0;

  const title = isSearching ? "No Schedules Match Your Search" : "No Schedules Found";

  const subtitle = isSearching
    ? `No results for "${searchText}" in ${config.title.toLowerCase()}`
    : `No schedules for ${config.title.toLowerCase()}`;

  return (
    <List.Section title="No Schedules">
      <List.Item
        title={title}
        subtitle={subtitle}
        icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Pagerduty Dashboard" url="https://app.pagerduty.com" />
            <Action title="Update Api Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

/**
 * Helper function to get appropriate icon for schedule status
 */
function getScheduleIcon(isPast: boolean, isActive: boolean) {
  if (isPast) {
    return {
      source: Icon.CheckCircle,
      tintColor: Color.SecondaryText,
    };
  }

  if (isActive) {
    return {
      source: Icon.ExclamationMark,
      tintColor: Color.Red,
    };
  }

  return {
    source: Icon.Calendar,
    tintColor: Color.Blue,
  };
}
