import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  List,
  confirmAlert,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  SearchHistoryEntry,
  CompanySearchHistoryEntry,
  CachedEmployee,
  HistoryEntry,
  loadAllHistory,
  removeSearchHistoryEntry,
  removeCompanySearchHistoryEntry,
  clearSearchHistory,
  clearCompanySearchHistory,
} from "./history-storage";
import { ResultsView } from "./email-finder";

// * Filter types
type FilterType = "all" | "email" | "company" | "success" | "error";

// * Format relative time
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  // Use locale-stable date format (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// * Cached result view from history
function HistoryResultView({ entry }: { entry: SearchHistoryEntry }) {
  const searchParams = {
    firstName: entry.firstName,
    lastName: entry.lastName,
    domain: entry.domain,
  };

  // Error entries: show error detail
  if (entry.status === "error") {
    return (
      <ResultsView
        data={undefined}
        isLoading={false}
        error={entry.error ?? "Unknown error"}
        searchParams={searchParams}
        onBack={() => {}}
      />
    );
  }

  // Success with cached data: show full results
  if (entry.enrichedData) {
    return (
      <ResultsView
        data={entry.enrichedData}
        isLoading={false}
        error={undefined}
        searchParams={searchParams}
        onBack={() => {}}
      />
    );
  }

  // Success but no cached data (older entries): show message
  return (
    <Detail
      markdown={`# Cached Result Not Available\n\nThis search was performed before result caching was enabled.\n\n**${entry.firstName} ${entry.lastName}** at **${entry.domain}**\n\nEmail: ${entry.email ?? "N/A"}`}
      actions={
        <ActionPanel>
          <Action
            title="Run Search"
            icon={Icon.MagnifyingGlass}
            onAction={async () => {
              await launchCommand({
                name: "email-finder",
                type: LaunchType.UserInitiated,
                arguments: {
                  firstName: entry.firstName,
                  lastName: entry.lastName,
                  domain: entry.domain,
                },
              });
            }}
          />
          {entry.email && (
            <Action.CopyToClipboard
              title="Copy Email"
              content={entry.email}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// * Type guards
function isEmailEntry(entry: HistoryEntry): entry is SearchHistoryEntry {
  return entry.type === "email" || !("type" in entry) || entry.type === undefined;
}

function isCompanyEntry(entry: HistoryEntry): entry is CompanySearchHistoryEntry {
  return entry.type === "company";
}

// * Group employees by department
interface DepartmentGroup {
  name: string;
  employees: CachedEmployee[];
}

function groupByDepartment(employees: CachedEmployee[]): DepartmentGroup[] {
  const departmentMap = new Map<string, CachedEmployee[]>();

  for (const employee of employees) {
    for (const dept of employee.departments) {
      const existing = departmentMap.get(dept) || [];
      existing.push(employee);
      departmentMap.set(dept, existing);
    }
  }

  const sortedDepts = Array.from(departmentMap.keys()).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });

  return sortedDepts.map((name) => ({
    name,
    employees: departmentMap.get(name) || [],
  }));
}

// * Cached company employees view
// * Get unique departments from cached employees
function getUniqueDepartments(employees: CachedEmployee[]): string[] {
  const depts = new Set<string>();
  for (const employee of employees) {
    for (const dept of employee.departments) {
      depts.add(dept);
    }
  }
  return Array.from(depts).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });
}

function CachedCompanyEmployeesView({ entry }: { entry: CompanySearchHistoryEntry }) {
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  if (!entry.employees || entry.employees.length === 0) {
    return (
      <Detail
        markdown={`# No Cached Employees\n\nNo employee data was cached for **${entry.companyName}** (${entry.domain}).`}
        actions={
          <ActionPanel>
            <Action
              title="Search Again"
              icon={Icon.MagnifyingGlass}
              onAction={async () => {
                await launchCommand({
                  name: "company-employees",
                  type: LaunchType.UserInitiated,
                  arguments: { domain: entry.domain },
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // * Filter employees by department, then group
  const filteredEmployees =
    departmentFilter === "all"
      ? entry.employees
      : entry.employees.filter((e) => e.departments.includes(departmentFilter));
  const departmentGroups = groupByDepartment(filteredEmployees);

  // * Intelligent fallback: If we have exactly 25 employees but pagination data is missing/invalid,
  // * assume there might be more pages (25 is the typical page size)
  const hasExactlyPageSize = entry.employees.length === 25;
  // Check if pagination is missing (0) OR suspicious (1 with exactly 25 employees suggests incomplete data)
  const paginationSuspicious = !entry.totalPages || entry.totalPages <= 1;
  const shouldShowLoadMore =
    (entry.currentPage && entry.totalPages && entry.totalPages > 1 && entry.currentPage < entry.totalPages) ||
    (hasExactlyPageSize && paginationSuspicious);

  return (
    <List
      navigationTitle={`${entry.companyName} - Cached`}
      searchBarPlaceholder="Filter employees..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Department" value={departmentFilter} onChange={setDepartmentFilter}>
          <List.Dropdown.Item title="All Departments" value="all" />
          <List.Dropdown.Section title="Departments">
            {getUniqueDepartments(entry.employees).map((dept) => (
              <List.Dropdown.Item key={dept} title={dept} value={dept} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.Section
        title="Cached Data"
        subtitle={`${entry.employees.length} employees from ${formatRelativeTime(entry.createdAt)}`}
      >
        <List.Item
          title="Refresh Data"
          subtitle="Search again for latest results"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Search Again"
                icon={Icon.MagnifyingGlass}
                onAction={async () => {
                  await launchCommand({
                    name: "company-employees",
                    type: LaunchType.UserInitiated,
                    arguments: { domain: entry.domain },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {departmentGroups.map((group) => (
        <List.Section key={group.name} title={group.name} subtitle={`${group.employees.length} employees`}>
          {group.employees.map((employee) => (
            <List.Item
              key={`${group.name}-${employee.id}`}
              title={employee.fullName}
              subtitle={employee.jobTitle}
              icon={Icon.Person}
              accessories={[
                { tag: { value: employee.departments[0], color: "#4CAF50" } },
                employee.seniority ? { tag: employee.seniority } : {},
                employee.location ? { text: employee.location, icon: Icon.Pin } : {},
              ].filter((a) => Object.keys(a).length > 0)}
              actions={
                <ActionPanel>
                  <Action
                    title="Reveal Profile"
                    icon={Icon.Person}
                    onAction={async () => {
                      await launchCommand({
                        name: "email-finder",
                        type: LaunchType.UserInitiated,
                        arguments: {
                          firstName: employee.firstName,
                          lastName: employee.lastName,
                          domain: entry.domain,
                        },
                      });
                    }}
                  />
                  {employee.linkedinUrl && (
                    <Action.OpenInBrowser
                      title="Open LinkedIn"
                      url={employee.linkedinUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}

      {/* Add Load More section at bottom if there might be more pages */}
      {shouldShowLoadMore && (
        <List.Section
          title="More Available"
          subtitle={
            entry.currentPage && entry.totalPages && entry.currentPage < entry.totalPages
              ? `Page ${entry.currentPage} of ${entry.totalPages} cached`
              : `${entry.employees.length} employees cached (may have more)`
          }
        >
          <List.Item
            title="Load More Employees"
            subtitle="Search again to load additional pages"
            icon={Icon.ArrowClockwise}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Search"
                  icon={Icon.MagnifyingGlass}
                  onAction={async () => {
                    await launchCommand({
                      name: "company-employees",
                      type: LaunchType.UserInitiated,
                      arguments: { domain: entry.domain },
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: entries, isLoading, revalidate } = usePromise(loadAllHistory);

  // * Filter entries based on dropdown selection
  const filteredEntries = (entries ?? []).filter((entry) => {
    switch (filter) {
      case "all":
        return true;
      case "email":
        return isEmailEntry(entry);
      case "company":
        return isCompanyEntry(entry);
      case "success":
      case "error":
        return isEmailEntry(entry) && entry.status === filter;
      default: {
        return false;
      }
    }
  });

  async function handleRunSearch(entry: SearchHistoryEntry) {
    await launchCommand({
      name: "email-finder",
      type: LaunchType.UserInitiated,
      arguments: {
        firstName: entry.firstName,
        lastName: entry.lastName,
        domain: entry.domain,
      },
    });
  }

  async function handleRemove(entry: HistoryEntry) {
    if (isCompanyEntry(entry)) {
      await removeCompanySearchHistoryEntry(entry.id);
    } else {
      await removeSearchHistoryEntry(entry.id);
    }
    revalidate();
  }

  async function handleClearAll() {
    if (
      await confirmAlert({
        title: "Clear All History?",
        message: "This will remove all search history entries. This cannot be undone.",
        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await Promise.all([clearSearchHistory(), clearCompanySearchHistory()]);
      revalidate();
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={(value) => setFilter(value as FilterType)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Email Searches" value="email" />
          <List.Dropdown.Item title="Company Searches" value="company" />
          <List.Dropdown.Item title="Successful" value="success" />
          <List.Dropdown.Item title="Failed" value="error" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Search History"
        description={filter === "all" ? "Your searches will appear here" : `No ${filter} searches found`}
        icon={Icon.MagnifyingGlass}
      />
      {filteredEntries.map((entry) =>
        isCompanyEntry(entry) ? (
          <List.Item
            key={entry.id}
            title={entry.companyName}
            subtitle={`${entry.domain}${entry.totalEmployees ? ` · ${entry.totalEmployees} employees` : entry.employees ? ` · ${entry.employees.length} employees` : ""}`}
            icon={entry.logoUrl ? { source: entry.logoUrl, fallback: Icon.Building } : Icon.Building}
            accessories={[
              { text: formatRelativeTime(entry.createdAt), tooltip: new Date(entry.createdAt).toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Employees"
                  icon={Icon.TwoPeople}
                  target={<CachedCompanyEmployeesView entry={entry} />}
                />
                <Action
                  title="Search Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={async () => {
                    await launchCommand({
                      name: "company-employees",
                      type: LaunchType.UserInitiated,
                      arguments: { domain: entry.domain },
                    });
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Domain"
                  content={entry.domain}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemove(entry)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            key={entry.id}
            title={`${entry.firstName} ${entry.lastName}`}
            subtitle={entry.domain}
            icon={
              entry.status === "success"
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.XMarkCircle, tintColor: Color.Red }
            }
            accessories={[
              entry.email
                ? { text: entry.email, icon: Icon.Envelope }
                : { text: entry.error ?? "Failed", icon: Icon.ExclamationMark },
              { text: formatRelativeTime(entry.createdAt), tooltip: new Date(entry.createdAt).toLocaleString() },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Result" icon={Icon.Eye} target={<HistoryResultView entry={entry} />} />
                <Action title="Run Search" icon={Icon.MagnifyingGlass} onAction={() => handleRunSearch(entry)} />
                {entry.email && (
                  <Action.CopyToClipboard
                    title="Copy Email"
                    content={entry.email}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemove(entry)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  onAction={handleClearAll}
                />
              </ActionPanel>
            }
          />
        ),
      )}
    </List>
  );
}
